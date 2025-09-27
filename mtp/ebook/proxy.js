 
const https = require('https');
const { URL } = require('url');

exports.handler = async (event) => {
  // 1. 先他妈干掉敏感头（防止暴露Netlify信息）
  const headers = { ...event.headers };
  delete headers.host;
  delete headers.referer;
  delete headers['x-forwarded-for'];

  // 2. 提取真实API路径（兼容路径末尾带/的情况）
  const apiPath = event.path.replace(/^\/mtp\/ebook\/proxy\/?/, ''); 

  try {
    // 3. 强制跳过证书验证（自签证书的祖传解决方案）
    const agent = new https.Agent({ rejectUnauthorized: false });
    
    // 4. 拼接目标URL（处理空路径和参数）
    const targetUrl = new URL(
      apiPath || '/', 
      'https://ikun.laoguantx.top:4390'
    );

    // 5. 带超时的请求（默认10秒，防止死等）
    const response = await Promise.race([
      new Promise((resolve, reject) => {
        const req = https.request({
          hostname: targetUrl.hostname,
          port: targetUrl.port || 443,
          path: `${targetUrl.pathname}${targetUrl.search || ''}`,
          method: event.httpMethod,
          headers,
          agent // 注入跳过证书的agent
        }, (res) => {
          let chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString()
          }));
        });
        req.on('error', reject);
        if (event.body) req.write(event.body);
        req.end();
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
      )
    ]);

    // 6. 返回时强制指定JSON类型（避免前端解析失败）
    return {
      statusCode: response.statusCode,
      headers: { 
        'content-type': 'application/json',
        ...response.headers
      },
      body: response.body
    };
  } catch (err) {
    // 7. 错误处理（带详细诊断信息）
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: '代理爆炸',
        reason: err.message,
        tip: '检查目标API是否存活/证书是否自签',
        yourRequest: {
          path: event.path,
          method: event.httpMethod,
          body: event.body
        }
      })
    };
  }
};
 