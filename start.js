const ProxyServer = require('./proxy');
const config = require('./config');

// 创建代理服务器实例
const proxyServer = new ProxyServer({
  port: config.server.port,
  host: config.server.host
});

// 启动服务器
const server = proxyServer.start();

// 处理进程信号，优雅关闭
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT signal, shutting down...');
  proxyServer.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM signal, shutting down...');
  proxyServer.stop();
  process.exit(0);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  proxyServer.stop();
  process.exit(1);
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});