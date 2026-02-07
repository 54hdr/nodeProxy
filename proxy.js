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

  sendError(res, statusCode, message) {
    res.writeHead(statusCode, {
      'Content-Type': 'text/plain',
      'Content-Length': message.length
    });
    res.end(message);
  }
}

module.exports = ProxyServer;