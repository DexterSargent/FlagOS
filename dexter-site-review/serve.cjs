const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".md": "text/plain", ".tsx": "text/plain", ".ts": "text/plain", ".cjs": "text/plain", ".mjs": "text/plain", ".yaml": "text/plain", ".rules": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon" };
function createServer() {
  return http.createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end("Read-only server"); return; }
    const host = request.headers.host || "";
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) { response.writeHead(403); response.end("Local host only"); return; }
    let relative;
    try { relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\/+/, ""); }
    catch { response.writeHead(400); response.end("Invalid path"); return; }
    if (!relative) { response.writeHead(302, { Location: "/dexter-site-review/" }); response.end(); return; }
    if (relative === "dexter-site-review/" || relative === "dexter-site-review") relative = "dexter-site-review/index.html";
    const parts = relative.split(/[\\/]/);
    const allowed = /^(dexter-site-review\/|src\/|docs\/|public\/|scripts\/)/.test(relative) ||
      ["package.json", "apphosting.yaml", "firestore.rules", "firestore.indexes.json", ".agents/verified_copy_library.md", ".agents/verified_design_library.md"].includes(relative);
    if (!allowed || parts.some((part) => part === ".." || part === "." || part.startsWith(".") && part !== ".agents")) {
      response.writeHead(403); response.end("Path not available in this read-only review server"); return;
    }
    const resolved = path.resolve(root, relative);
    const extension = path.extname(resolved);
    if (!resolved.startsWith(root + path.sep) || !Object.hasOwn(types, extension)) { response.writeHead(403); response.end("File type not allowed"); return; }
    fs.realpath(resolved, (error, real) => {
      if (error || !real.startsWith(root + path.sep)) { response.writeHead(404); response.end("File not found"); return; }
      fs.stat(real, (statError, stats) => {
        if (statError || !stats.isFile()) { response.writeHead(404); response.end("File not found"); return; }
        response.writeHead(200, { "Content-Type": types[extension] + (types[extension].startsWith("text/") || extension === ".json" ? "; charset=utf-8" : ""), "Content-Length": stats.size });
        if (request.method === "HEAD") response.end();
        else {
          const stream = fs.createReadStream(real);
          stream.on("error", () => response.destroy());
          stream.pipe(response);
        }
      });
    });
  });
}
module.exports = { createServer };
if (require.main === module) {
  const port = Number(process.argv[2] || 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Choose a port between 1024 and 65535.");
  const server = createServer();
  server.on("error", (error) => { console.error(`Review server failed: ${error.message}`); process.exitCode = 1; });
  server.listen(port, "127.0.0.1", () => console.log(`Review dashboard: http://127.0.0.1:${port}/dexter-site-review/ (Ctrl+C to stop)`));
}
