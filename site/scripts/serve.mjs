import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(
  new URL(
    process.argv.includes("--built") ? "../dist/" : "../",
    import.meta.url,
  ),
);
export function createServer() {
  return http.createServer(async (request, response) => {
    try {
      let pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      // Exercise the actual GitHub project path as well as root hosting.
      const base = "/dsh-halo-research";
      if (pathname === base) {
        response.writeHead(302, { Location: base + "/" });
        response.end();
        return;
      }
      if (pathname.startsWith(base + "/"))
        pathname = pathname.slice(base.length);
      if (pathname.endsWith("/")) pathname += "index.html";
      const relative = pathname.replace(/^\/+/, "");
      const allowed =
        /^(?:index\.html|styles\.css|site\.js|assets\/(?:mark\.svg|desktop-mission-control\.png))$/;
      if (!allowed.test(relative)) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      const target = path.resolve(root, relative);
      await stat(target);
      const types = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
      response.writeHead(200, {
        "Content-Type": types[path.extname(target)],
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      });
      response.end(
        request.method === "HEAD" ? undefined : await readFile(target),
      );
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = createServer();
  const port = Number(process.env.PORT || 4178);
  server.listen(port, "127.0.0.1", () =>
    console.log(`Site preview: http://127.0.0.1:${port}/dsh-halo-research/`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => server.close());
}
