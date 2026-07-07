qTransfer
=========

Open source WebRTC P2P temporary file transfer between two devices.

The browser still sends files directly over WebRTC. The backend only handles:

- PeerJS signaling at `/peer`
- temporary TURN credentials at `/ice`
- health checks at `/healthz`

## Local checks

```sh
npm test
npm run check:html
```

## Backend deploy

1. Copy `.env.example` to `.env`.
2. Set a long random `TURN_SECRET`.
3. Point DNS at the VPS:
   - `qtransfer.app`
   - `turn.qtransfer.app`
4. Run:

```sh
docker compose up -d
```

Ports needed on the VPS:

```txt
80/tcp
443/tcp
3478/udp
3478/tcp
5349/tcp
49160-49200/udp
```

## Client behavior

The app tries `/ice` for self-hosted PeerJS + STUN/TURN. If that fails, it falls back to public PeerJS + public STUN so the static app still works during rollout.

Connections have a 12 second watchdog. A failed connection returns the UI to a retryable state instead of spinning forever.
