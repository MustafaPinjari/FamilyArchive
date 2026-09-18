const http = require("http");

const server = http.createServer((req, res) => {
  const options = {
    hostname: "localhost",
    port: 3000,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway: " + err.message);
  });

  req.pipe(proxy, { end: true });
});

server.listen(3001, () => {
  console.log("Proxy listening on port 3001 -> forwarding to 3000");
});
