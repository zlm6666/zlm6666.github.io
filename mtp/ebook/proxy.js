const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // 获取原始请求的路径和查询参数
    const originalPath = event.path.replace('/.netlify/functions/proxy', '');
    const queryString = event.queryStringParameters 
      ? '?' + new URLSearchParams(event.queryStringParameters).toString()
      : '';
    
    // 构建目标URL
    const targetUrl = `https://ikun.laoguantx.top:4390${originalPath}${queryString}`;
    
    console.log('代理请求:', targetUrl);
    
    // 准备请求选项
    const requestOptions = {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Netlify-Proxy-Function/1.0'
      }
    };
    
    // 如果有请求体，添加到选项中
    if (event.body && event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
      requestOptions.body = event.body;
      
      // 保留原始的内容类型
      if (event.headers['content-type']) {
        requestOptions.headers['Content-Type'] = event.headers['content-type'];
      }
    }
    
    // 发送请求到目标服务器
    const response = await fetch(targetUrl, requestOptions);
    
    // 获取响应数据
    const data = await response.text();
    
    // 返回响应给客户端
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: data
    };
    
  } catch (error) {
    // 返回详细的错误信息
    console.error('代理错误:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: true,
        message: '代理请求失败',
        detailedError: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          url: event.path,
          timestamp: new Date().toISOString()
        }
      }, null, 2)
    };
  }
};
