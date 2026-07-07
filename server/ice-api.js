const crypto = require("node:crypto");
const http = require("node:http");

const env = (k, d) => process.env[k] || d;
const num = (k, d) => Number(env(k, d));
const bool = (k, d) => (process.env[k] ? process.env[k] !== "false" : d);

function turnCredential({ now = Date.now(), secret = env("TURN_SECRET", "dev-secret"), ttl = num("ICE_TTL_SECONDS", 600), random = crypto.randomBytes(8).toString("hex") } = {}) {
  const username = `${Math.floor(now / 1000) + ttl}:${random}`;
  return { username, credential: crypto.createHmac("sha1", secret).update(username).digest("base64") };
}

function icePayload(req = { headers: {} }, now = Date.now()) {
  const hostHeader = (req.headers.host || "localhost").split(":");
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const turnHost = env("TURN_HOST", hostHeader[0]);
  const ttl = num("ICE_TTL_SECONDS", 600);
  const peerSecure = bool("PEER_SECURE", proto === "https");
  const peerPort = num("PEER_PORT", hostHeader[1] || (peerSecure ? 443 : 80));
  const turnUrls = [
    `turn:${turnHost}:${env("TURN_PORT", "3478")}?transport=udp`,
    `turn:${turnHost}:${env("TURN_PORT", "3478")}?transport=tcp`,
  ];
  if (env("TURN_TLS_PORT", "5349")) turnUrls.push(`turns:${turnHost}:${env("TURN_TLS_PORT", "5349")}?transport=tcp`);
  return {
    ttl,
    peer: { host: env("PEER_HOST", hostHeader[0]), port: peerPort, path: env("PEER_PATH", "/peer"), secure: peerSecure },
    iceServers: [
      { urls: [`stun:${turnHost}:${env("STUN_PORT", "3478")}`] },
      { urls: turnUrls, ...turnCredential({ now, ttl }) },
    ],
  };
}

const hits = new Map();
function limited(ip, now = Date.now(), max = num("ICE_RATE_LIMIT", 60), windowMs = num("ICE_RATE_WINDOW_MS", 60000)) {
  const xs = (hits.get(ip) || []).filter(t => now - t < windowMs);
  if (xs.length >= max) return true;
  xs.push(now); hits.set(ip, xs); return false;
}

function send(res, code, body) {
  res.writeHead(code, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "access-control-allow-origin": env("PUBLIC_BASE_URL", "*"),
    "access-control-allow-methods": "GET,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function handler(req, res) {
  const path = new URL(req.url, "http://localhost").pathname;
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (path === "/healthz") return send(res, 200, { ok: true });
  if (path === "/ice") {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
    return limited(ip) ? send(res, 429, { error: "rate_limited" }) : send(res, 200, icePayload(req));
  }
  send(res, 404, { error: "not_found" });
}

if (require.main === module) http.createServer(handler).listen(num("PORT", 8080), () => console.log(`ice-api listening on ${num("PORT", 8080)}`));

module.exports = { handler, icePayload, limited, turnCredential };
