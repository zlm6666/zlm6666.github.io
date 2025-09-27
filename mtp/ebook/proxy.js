// 用 Node.js 原生 https 模块（无需安装依赖）
const https = require('https');
const { URL } = require('url');

exports.handler = async (event) => {
  try {
    // --------------------------
    // 关键配置：改这里！
    // --------------------------
    const TARGET_API = 'https://ikun.laoguantx.top:4390'; // 目标API（必须是HTTPS）
    const PROXY_PREFIX = '/mtp/ebook/proxy';             // 前端请求的路径前缀
    // --------------------------

    // 1. 提取真实API的路径+参数（去掉代理前缀）
    const apiPath = event.path.replace(PROXY_PREFIX, '');

    // 2. 构造目标API的完整URL
    const targetUrl = new URL(apiPath, TARGET_API);

    // 3. 准备转发请求的选项（hostname、port、path、method、headers）
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 443, // HTTPS默认443，你的API是4390，这里会自动用4390
      path: targetUrl.pathname + targetUrl.search, // 完整路径+参数
      method: event.httpMethod,    // 前端用的方法（GET/POST等）
      headers: { ...event.headers }, // 前端的请求头（保持一致）
    };

    // 4. 转发请求到目标API（处理请求体）
    const response = await new Promise((resolve, reject) => {
      // 发送请求到目标API
      const req = https.request(options, (res) => {
        let data = '';
        // 收集目标API的响应数据
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(res));
      });

      // 处理请求错误
      req.on('error', (err) => reject(err));

      // 如果前端有请求体（比如POST），转发给目标API
      if (event.body) {
        req.write(event.body);
      }

      req.end(); // 结束请求
    });

    // 5. 把目标API的响应返回给前端
    return {
      statusCode: response.statusCode,
      headers: { ...response.headers, 'Content-Type': 'application/json' },
      body: response.data, // 目标API的响应数据（已经是字符串）
    };

  } catch (err) {
    // 出错时返回错误信息
    return {
      statusCode: err.code === 'ECONNREFUSED' ? 502 : 500,
      body: JSON.stringify({
        error: '代理失败',
        message: err.message,
        details: err.code,
      }),
    };
  }
};
