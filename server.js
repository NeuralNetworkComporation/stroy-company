const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = __dirname;
const parsedPort = Number.parseInt(process.env.PORT || "", 10);
const preferredPort = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536
  ? parsedPort
  : 5173;
const host = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production"
  || (!process.env.NODE_ENV && process.env.npm_lifecycle_event !== "dev");
const imageExtensions = new Set([".avif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const publicRules = new Map([
  ["assets", new Set([...imageExtensions, ".woff2"])],
  ["css", new Set([".css"])],
  ["images", imageExtensions],
  ["js", new Set([".js"])],
  ["pages", new Set([".html"])],
  ["video", new Set([".mp4", ".webm"])],
]);
const rootPublicFiles = new Set([
  "404.html",
  "favicon.ico",
  "index.html",
  "robots.txt",
  "sitemap.xml",
]);
const canonicalRoot = fs.realpathSync(root);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".avif": "image/avif",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const safeResolve = (urlPath) => {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }

  if (/[\u0000-\u001f\u007f\\]/u.test(decoded)) return null;

  const clean = decoded === "/" ? "/index.html" : decoded;
  const resolved = path.resolve(root, `.${clean}`);
  const relative = path.relative(root, resolved);
  const segments = relative.split(path.sep);
  const extension = path.extname(relative).toLowerCase();

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  if (segments.some((segment) => segment.startsWith("."))) return null;
  if (!rootPublicFiles.has(relative)) {
    const allowedExtensions = publicRules.get(segments[0]);
    if (!allowedExtensions || !allowedExtensions.has(extension)) return null;
  }

  return resolved;
};

const securityHeaders = () => {
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://www.openstreetmap.org https://www.youtube-nocookie.com",
    // i.ytimg.com serves the thumbnails the YouTube player draws once a video is started.
    "img-src 'self' data: https://i.ytimg.com",
    "media-src 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
  ];
  if (isProduction) policy.push("upgrade-insecure-requests");

  const headers = {
    "content-security-policy": policy.join("; "),
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "origin-agent-cluster": "?1",
    "permissions-policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-permitted-cross-domain-policies": "none",
  };
  if (isProduction) headers["strict-transport-security"] = "max-age=15552000";
  return headers;
};

const sendText = (res, status, body, extraHeaders = {}) => {
  const data = Buffer.from(body, "utf8");
  res.writeHead(status, {
    ...securityHeaders(),
    "cache-control": "no-store",
    "content-type": "text/plain; charset=utf-8",
    "content-length": data.length,
    ...extraHeaders,
  });
  res.end(data);
};

const compressibleTypes = new Set([".css", ".html", ".js", ".svg", ".txt", ".xml"]);

const negotiateEncoding = (acceptEncoding) => {
  const accepted = String(acceptEncoding || "").toLowerCase();
  if (accepted.includes("br")) return "br";
  if (accepted.includes("gzip")) return "gzip";
  return null;
};

/**
 * A single `bytes=` range, clamped to the file. Browsers seek in a video by
 * asking for the byte window around the target frame, so without this the
 * player can load a clip but never jump inside it.
 */
const parseRange = (header, size) => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header || "").trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  let start;
  let end;
  if (rawStart === "") {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
};

const notFoundPage = path.join(root, "404.html");

/**
 * Browsers asking for a document get the styled 404 page; asset requests
 * (a missing image, stylesheet, script) keep the cheap plain-text reply so
 * we never hand an HTML body to something expecting a binary.
 */
const sendNotFound = (req, res) => {
  const wantsHtml = (req.headers.accept || "").includes("text/html");
  if (!wantsHtml || req.method === "HEAD") {
    sendText(res, 404, "Not found");
    return;
  }

  fs.readFile(notFoundPage, (error, data) => {
    if (error) {
      sendText(res, 404, "Not found");
      return;
    }
    res.writeHead(404, {
      ...securityHeaders(),
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
      "content-length": data.length,
    });
    res.end(data);
  });
};

const server = http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method || "")) {
    sendText(res, 405, "Method not allowed", { "allow": "GET, HEAD" });
    return;
  }

  if ((req.url || "").length > 2048) {
    sendText(res, 414, "URI too long");
    return;
  }

  const filePath = safeResolve(req.url || "/");
  if (!filePath) {
    sendNotFound(req, res);
    return;
  }

  fs.realpath(filePath, (realPathError, target) => {
    if (realPathError) {
      sendNotFound(req, res);
      return;
    }

    const relativeTarget = path.relative(canonicalRoot, target);
    if (!relativeTarget || relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
      sendNotFound(req, res);
      return;
    }

    fs.stat(target, (statError, stat) => {
      if (statError || !stat.isFile()) {
        sendNotFound(req, res);
        return;
      }

      const extension = path.extname(target).toLowerCase();
      const isDocument = extension === ".html";
      const headers = {
        ...securityHeaders(),
        "content-type": mime[extension],
        "cache-control": isProduction && !isDocument
          ? "public, max-age=86400"
          : "no-store",
      };

      // Text assets compress dramatically (the stylesheet alone drops from
      // ~107 KB to ~18 KB); images and fonts are already compressed, so
      // running them through gzip would only burn CPU.
      const encoding = compressibleTypes.has(extension)
        ? negotiateEncoding(req.headers["accept-encoding"])
        : null;

      // Only uncompressed responses can be served in byte ranges.
      const range = encoding ? null : parseRange(req.headers.range, stat.size);
      if (range === "unsatisfiable") {
        sendText(res, 416, "Range not satisfiable", {
          "content-range": `bytes */${stat.size}`,
        });
        return;
      }

      if (encoding) {
        headers["content-encoding"] = encoding;
        headers["vary"] = "Accept-Encoding";
      } else {
        headers["accept-ranges"] = "bytes";
        headers["content-length"] = range ? range.end - range.start + 1 : stat.size;
        if (range) headers["content-range"] = `bytes ${range.start}-${range.end}/${stat.size}`;
      }

      const status = range ? 206 : 200;
      if (req.method === "HEAD") {
        res.writeHead(status, headers);
        res.end();
        return;
      }

      res.writeHead(status, headers);
      const stream = range
        ? fs.createReadStream(target, { start: range.start, end: range.end })
        : fs.createReadStream(target);
      stream.on("error", () => {
        if (!res.headersSent) sendText(res, 500, "Internal server error");
        else res.destroy();
      });

      if (!encoding) {
        stream.pipe(res);
        return;
      }

      const compressor = encoding === "br"
        ? zlib.createBrotliCompress({
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
          })
        : zlib.createGzip({ level: 6 });
      compressor.on("error", () => res.destroy());
      stream.pipe(compressor).pipe(res);
    });
  });
});

const listen = (port) => {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      if (!isProduction && port < 65535) {
        listen(port + 1);
        return;
      }
      console.error(`Port ${port} is already in use`);
      process.exit(1);
      return;
    }
    console.error(error);
    process.exit(1);
  });
  server.listen(port, host, () => {
    console.log(`BERG HOUSE server: http://${host}:${port}`);
  });
};

server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 100;

listen(preferredPort);
