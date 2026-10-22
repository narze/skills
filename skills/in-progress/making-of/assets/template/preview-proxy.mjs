import http from "node:http";

// Relays a tailnet HTTPS origin to the local Studio, rejecting requests from any other origin.
// STUDIO_PORT: local Remotion Studio port. PROXY_PORT: where `tailscale serve` points.
// ALLOWED_ORIGIN: the public tailnet URL, e.g. https://my-mac.tail1234.ts.net:8793
const upstream = { hostname: "127.0.0.1", port: Number(process.env.STUDIO_PORT ?? 8792) };
const listenPort = Number(process.env.PROXY_PORT ?? 8794);
const allowedOrigin = process.env.ALLOWED_ORIGIN;
if (!allowedOrigin) throw new Error("Set ALLOWED_ORIGIN to the tailnet URL that will open Studio");
const upstreamOrigin = `http://${upstream.hostname}:${upstream.port}`;

const makeHeaders = (headers) => ({
  ...headers,
  host: `${upstream.hostname}:${upstream.port}`,
  ...(headers.origin ? { origin: upstreamOrigin } : {}),
});

const rejectOrigin = (origin) => typeof origin === "string" && origin !== allowedOrigin;

const server = http.createServer((request, response) => {
  if (rejectOrigin(request.headers.origin)) {
    response.writeHead(403, { "content-type": "text/plain" });
    response.end("Origin not allowed");
    return;
  }

  const proxyRequest = http.request(
    {
      ...upstream,
      path: request.url,
      method: request.method,
      headers: makeHeaders(request.headers),
    },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
      proxyResponse.pipe(response);
    },
  );

  proxyRequest.on("error", () => {
    if (!response.headersSent) response.writeHead(502);
    response.end("Studio preview unavailable");
  });
  request.pipe(proxyRequest);
});

server.on("upgrade", (request, socket, head) => {
  if (rejectOrigin(request.headers.origin)) {
    socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    return;
  }

  const proxyRequest = http.request({
    ...upstream,
    path: request.url,
    method: request.method,
    headers: makeHeaders(request.headers),
  });

  proxyRequest.on("upgrade", (response, proxySocket, proxyHead) => {
    const status = `HTTP/1.1 ${response.statusCode ?? 101} ${response.statusMessage ?? "Switching Protocols"}`;
    const headers = Object.entries(response.headers)
      .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join("\r\n");
    socket.write(`${status}\r\n${headers}\r\n\r\n`);
    if (proxyHead.length) socket.write(proxyHead);
    if (head.length) proxySocket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyRequest.on("error", () => socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n"));
  proxyRequest.end();
});

server.listen(listenPort, "127.0.0.1", () => {
  process.stdout.write(`Preview proxy listening on 127.0.0.1:${listenPort}\n`);
});
