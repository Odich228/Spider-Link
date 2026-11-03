import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
let host = "127.0.0.1";
let port = 5173;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--") continue;
  const equal = args[i].indexOf("=");
  const flag = equal === -1 ? args[i] : args[i].slice(0, equal);
  const inline = equal === -1 ? undefined : args[i].slice(equal + 1);
  if (!["--port", "-p", "--host", "--hostname"].includes(flag)) {
    throw new Error(`Unknown option: ${flag}`);
  }
  const value = inline ?? args[++i];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
  if (flag === "--port" || flag === "-p") {
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
      throw new Error("Port must be an integer from 1 to 65535.");
    }
    port = Number(value);
  } else {
    if (!["127.0.0.1", "localhost", "::1"].includes(value)) {
      throw new Error("Local preview host must be 127.0.0.1, localhost, or ::1.");
    }
    host = value;
  }
}

await readFile(resolve(root, "index.html"));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname.includes("\0")) throw new Error("Invalid path");
    const path = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    const local = relative(root, path);
    if (local === ".." || local.startsWith(`..${sep}`) || local.split(/[\\/]/).some(part => part.startsWith("."))) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(path);
    response.writeHead(200, {
      "Content-Type": types[extname(path).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": body.length,
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    const status = error.code === "ENOENT" || error.code === "EISDIR" ? 404 : 400;
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }).end(status === 404 ? "Not found" : "Invalid request");
  }
});
server.on("error", error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  const address = host.includes(":") ? `[${host}]` : host;
  console.log(`SPIDER-LINK Local: http://${address}:${port}`);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
