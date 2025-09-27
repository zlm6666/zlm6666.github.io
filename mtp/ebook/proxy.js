// 用 Netlify 支持的 ES 模块语法（Node.js 18+ 环境）
import axios from 'axios';

exports.handler = async (event) => {
  try {
    // --------------------------
    // 关键配置：改这里！
    // --------------------------
    const TARGET_API = 'https://ikun.laoguantx.top:4390'; // 你要访问的真实 API
    const PROXY_PREFIX = '/mtp/ebook/proxy';             // 你的代理路径前缀（必须和前端请求的一致）
    // --------------------------

    // 1. 从请求路径中提取「真实 API 的路径+参数」（去掉代理前缀）
    // 比如前端请求路径是 `/mtp/ebook/proxy/rabb?canshu=1` → 提取出 `/rabb?canshu=1`
    let apiPath = event.path.replace(PROXY_PREFIX, '');

    // 2. 拼接完整的真实 API 地址（TARGET_API + 前端要访问的路径）
    const REAL_API_URL = `${TARGET_API}${apiPath}`;

    // 3. 把前端的请求「原样转发」给真实 API（保持方法、参数、请求体一致）
    const response = await axios({
      method: event.httpMethod,       // 前端用 GET/POST，这里就发 GET/POST
      url: REAL_API_URL,              // 真实 API 地址
      data: event.body,               // 前端的请求体（比如 POST 的 JSON）
      headers: { ...event.headers },  // 前端的请求头（可选，大部分情况不需要改）
    });

    // 4. 把真实 API 的响应「原样返回给前端」
    return {
      statusCode: response.status,                // 真实 API 的状态码（比如 200）
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response.data),        // 真实 API 返回的数据
    };

  } catch (err) {
    // 出错时返回错误信息（方便调试）
    return {
      statusCode: err.response?.status || 500,
      body: JSON.stringify({
        error: '代理失败',
        message: err.message,
        details: err.response?.data, // 真实 API 返回的错误信息（如果有）
      }),
    };
  }
};
