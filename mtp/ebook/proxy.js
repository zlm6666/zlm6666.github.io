// 1. 引入Node.js原生模块（无需安装任何依赖）
const https = require('https');
const { URL } = require('url');

// 2. 导出Netlify函数的处理逻辑
exports.handler = async (event) => {
  try {
    // --------------------------
    // 【关键配置】必须改对！
    // --------------------------
    const TARGET_API = 'https://ikun.laoguantx.top:4390'; // ✅ 真实要访问的API地址（不是你自己的Netlify站点！）
    const PROXY_PREFIX = '/mtp/ebook/proxy';             // ✅ 前端请求的路径前缀（必须和访问的一致）
    // --------------------------

    // 3. 提取前端请求中的「真实API路径+参数」（去掉代理前缀）
    // 例如：前端请求 /mtp/ebook/proxy/rabb?canshu=111 → 提取出 /rabb?canshu=111
    const apiPath = event.path.replace(PROXY_PREFIX, '');

    // 4. 构造目标API的完整URL（拼接路径和参数）
    const targetUrl = new URL(apiPath, TARGET_API);

    // 5. 准备转发请求的配置（hostname、端口、路径、方法、请求头）
    const options = {
      hostname: targetUrl.hostname,       // 目标API的主机名（ikun.laoguantx.top）
      port: targetUrl.port || 443,        // 目标API的端口（HTTPS默认443，你的API是4390会自动用4390）
      path: `${targetUrl.pathname}${targetUrl.search}`, // 完整路径+参数（/rabb?canshu=111）
      method: event.httpMethod,           // 前端请求的方法（GET/POST/PUT等）
      headers: { ...event.headers },      // 保留前端的请求头（保持一致性）
    };

    // 6. 转发请求到目标API（处理请求体和响应）
    const response = await new Promise((resolve, reject) => {
      // a. 向目标API发送请求
      const req = https.request(options, (res) => {
        let responseData = ''; // 存储目标API的响应数据
        
        // 收集响应数据（分块接收）
        res.on('data', (chunk) => responseData += chunk);
        
        // 响应结束，解析结果
        res.on('end', () => resolve(res));
      });

      // b. 处理请求错误（比如网络不通）
      req.on('error', (err) => reject(err));

      // c. 如果前端有请求体（比如POST/PUT），转发给目标API
      if (event.body) {
        req.write(event.body);
      }

      // d. 结束请求（必须调用，否则请求不会发送）
      req.end();
    });

    // 7. 把目标API的响应原样返回给前端
    return {
      statusCode: response.statusCode, // 目标API的状态码（比如200/404）
      headers: { 
        ...response.headers, 
        'Content-Type': 'application/json' // 确保前端能正确解析JSON
      },
      body: response.data, // 目标API的响应数据（已经是字符串）
    };

  } catch (err) {
    // 8. 出错时返回友好的错误信息（方便调试）
    return {
      statusCode: err.code === 'ECONNREFUSED' ? 502 : 500, // 连接失败返回502，其他错误返回500
      body: JSON.stringify({
        error: '代理失败',
        message: err.message, // 错误描述（比如“证书无效”）
        details: err.code,    // 错误代码（比如“ERR_TLS_CERT_ALTNAME_INVALID”）
      }),
    };
  }
};
