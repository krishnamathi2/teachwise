const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', path: req.url }));
});

server.listen(4001, '127.0.0.1', () => {
  console.log('Test server running on http://127.0.0.1:4001');
});