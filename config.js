// 代理服务器配置
const config = {
  // 服务器配置
  server: {
    port: process.env.PROXY_PORT || 15007,
    host: process.env.PROXY_HOST || '0.0.0.0'
  },
  
  // 日志配置
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;