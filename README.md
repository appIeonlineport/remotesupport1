# Remote Support MVP

A consent-first Windows/macOS remote-support desktop app. It provides short-lived
session codes, an explicit host approval screen, WebRTC screen streaming, a
remote-control data channel, a persistent session banner, and an emergency
disconnect button.

## Safety defaults

- A person at the host computer must approve every support session.
- Session codes expire after 10 minutes and are invalidated after use.
- Remote input is accepted only while the visible session banner is active.
- Unattended access is off by default and must be enabled locally.
- No hidden mode, credential capture, or background persistence is included.

## Run locally

Prerequisites: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

The signaling service listens at `ws://localhost:8787`. Open the desktop app on
two computers, set `SIGNAL_URL` to a reachable TLS WebSocket endpoint in
production, and choose **Receive support** on one and **Provide support** on the
other.

## Current milestone

This repository contains the working connection, consent, streaming, and native
input pipeline. The Windows helper uses `SendInput`; the macOS helper uses
`CGEvent` and requires Accessibility permission. Helpers are spawned only after
local session approval and are terminated on disconnect.

## Build installable apps

On Windows, run `npm run package:win` to create an NSIS `.exe` installer.

On macOS, run `npm run package:mac` to create a `.dmg`. A public release must be
signed and notarized with an Apple Developer identity.

The included GitHub Actions workflow builds both installers on their native
operating systems when a `v*` tag is pushed or the workflow is run manually.
The signaling service includes a Docker image and `/health` endpoint; see
`docs/DEPLOYMENT.md` for the live-service setup.

## Production requirements

- Serve signaling over WSS and add authenticated accounts.
- Deploy TURN (for example, coturn) and rotate credentials.
- Sign/notarize Windows and macOS builds.
- Implement the native control adapter only after OS permission checks.
- Add audit retention, abuse reporting, rate limits, and forced upgrades.
