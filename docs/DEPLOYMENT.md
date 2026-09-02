# Deployment

## 1. Signaling server

Deploy the root `Dockerfile` to a container host and expose port `8787`. The
host must support WebSocket upgrades. Verify `GET /health` returns HTTP 200 and
terminate TLS at the platform so the public endpoint uses `wss://`.

## 2. Desktop builds

In GitHub repository settings, create an Actions variable named `SIGNAL_URL`
with the public `wss://` signaling endpoint. Run **Build desktop installers** or
push a version tag such as `v0.2.0`. Windows and macOS installers are uploaded
as workflow artifacts.

## 3. Signing before public distribution

Unsigned installers are suitable only for development. Configure a Windows
code-signing certificate and an Apple Developer ID/notarization credentials
before distributing the app to customers.

## 4. Network production checklist

- Add an authenticated account/device layer before enabling unattended access.
- Add TURN with short-lived credentials for restrictive networks.
- Apply connection and session-code rate limits at the edge.
- Set monitoring and alerting on `/health`.
- Keep the session service free of screen, input, and secret logging.
