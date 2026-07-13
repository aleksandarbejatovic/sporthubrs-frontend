import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.FRONTEND_PORT || 5173);
const host = process.env.FRONTEND_HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    const requested = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[\\/]+/, "");
    let target = join(root, requested === "/" ? "index.html" : requested);

    try {
      const info = await stat(target);
      if (info.isDirectory()) target = join(target, "index.html");
    } catch {
      target = join(root, "index.html");
    }

    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": types[extname(target)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Frontend server error: ${error.message}`);
  }
}).listen(port, host, () => {
  console.log(`SportHub RS frontend: http://${host}:${port}`);
});
