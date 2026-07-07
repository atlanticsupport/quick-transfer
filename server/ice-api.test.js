const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { icePayload, limited, turnCredential } = require("./ice-api");

process.env.TURN_SECRET = "test-secret";
process.env.TURN_HOST = "turn.example.com";
process.env.ICE_TTL_SECONDS = "600";

const c = turnCredential({ now: 0, secret: "test-secret", ttl: 600, random: "abc" });
assert.equal(c.username, "600:abc");
assert.equal(c.credential, crypto.createHmac("sha1", "test-secret").update("600:abc").digest("base64"));

const p = icePayload({ headers: { host: "qtransfer.example", "x-forwarded-proto": "https" } }, 0);
assert.equal(p.ttl, 600);
assert.equal(p.peer.host, "qtransfer.example");
assert.equal(p.peer.path, "/peer");
assert.equal(p.peer.secure, true);
assert.equal(p.iceServers[0].urls[0], "stun:turn.example.com:3478");
assert.ok(p.iceServers[1].urls.some(x => x.startsWith("turn:")));
assert.ok(p.iceServers[1].urls.some(x => x.startsWith("turns:")));

assert.equal(limited("ip", 0, 2, 1000), false);
assert.equal(limited("ip", 1, 2, 1000), false);
assert.equal(limited("ip", 2, 2, 1000), true);

console.log("ice-api ok");
