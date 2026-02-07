const http = require('http');
const url = require('url');

class ProxyServer {
  constructor(config = {}) {
    this.port = config.port || 8080;
    this.host = config.host || '0.0.0.0';
    this.server = null;
    this.logger = config.logger || console;
  }

  start() {
    this.server = http.createServer((clientReq, clientRes) => {
      this.handleRequest(clientReq, clientRes);
    });

    this.server.on('error', (error) => {
      this.logger.error('Server error:', error);
    });

    this.server.listen(this.port, this.host, () => {
      this.logger.info(`Proxy server started on ${this.host}:${this.port}`);
    });

    return this.server;
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.logger.info('Proxy server stopped');
    }
  }

  handleRequest(clientReq, clientRes) {
    try {
      // 处理HTTPS CONNECT请求
      if (clientReq.method === 'CONNECT') {
        this.handleConnectRequest(clientReq, clientRes);
        return;
      }

      const parsedUrl = url.parse(clientReq.url);
      
      if (!parsedUrl.hostname) {
        this.sendError(clientRes, 400, 'Bad Request: Missing hostname');
        return;
      }

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.path || '/',
        method: clientReq.method,
        headers: clientReq.headers
      };

      // 移除可能导致问题的头部
      delete options.headers['proxy-connection'];
      delete options.headers['connection'];
      delete options.headers['keep-alive'];
      delete options.headers['transfer-encoding'];
      delete options.headers['upgrade'];

      this.logger.info(`${clientReq.method} ${parsedUrl.hostname}${parsedUrl.path}`);

      const serverReq = http.request(options, (serverRes) => {
        clientRes.writeHead(serverRes.statusCode, serverRes.headers);
        serverRes.pipe(clientRes);
      });

      serverReq.on('error', (error) => {
        this.logger.error('Request error:', error);
        this.sendError(clientRes, 502, 'Bad Gateway: ' + error.message);
      });

      clientReq.pipe(serverReq);
    } catch (error) {
      this.logger.error('Unexpected error:', error);
      this.sendError(clientRes, 500, 'Internal Server Error');
    }
  }

  handleConnectRequest(clientReq, clientRes) {
    try {
      const [hostname, port] = clientReq.url.split(':');
      const targetPort = port || 443;

      this.logger.info(`CONNECT ${hostname}:${targetPort}`);

      // 建立到目标服务器的TCP连接
      const net = require('net');
      const serverSocket = net.connect(targetPort, hostname, () => {
        // 连接成功，响应客户端
        clientRes.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        // 建立双向管道
        serverSocket.pipe(clientRes);
        clientRes.pipe(serverSocket);
      });

      serverSocket.on('error', (error) => {
        this.logger.error('CONNECT error:', error);
        clientRes.end();
      });

      clientRes.on('error', (error) => {
        this.logger.error('Client error:', error);
        serverSocket.end();
      });
    } catch (error) {
      this.logger.error('CONNECT unexpected error:', error);
      clientRes.end();
    }
  }

  sendError(res, statusCode, message) {
    res.writeHead(statusCode, {
      'Content-Type': 'text/plain',
      'Content-Length': message.length
    });
    res.end(message);
  }
}

module.exports = ProxyServer;