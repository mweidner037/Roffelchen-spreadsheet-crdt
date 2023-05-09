const { startWebSocketServer } = require("@collabs/ws-server");
const { createServer } = require("http");
const { env } = require("process");

const hostname = "localhost";
const port = env.PORT || 1235;

const server = createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello World");
});

server.listen(port, hostname, () => {
  console.log(`Listening at http://localhost:${port}/`)
});

startWebSocketServer({server});