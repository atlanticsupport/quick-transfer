qTransfer
=========

Open source WebRTC P2P temporary file transfer between two devices.

The app is intentionally tiny: one static HTML page plus logo assets.

Files are sent directly between browsers over WebRTC. No file data is stored on a server.

## Check

```sh
node -e "const fs=require('fs');new Function(fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1]);console.log('js ok')"
```

## Client behavior

The app tries `/ice` if a future backend exists. If not, it falls back to public PeerJS + public STUN.

Connections have a 12 second watchdog, so failed attempts return to a retryable state instead of spinning forever.
