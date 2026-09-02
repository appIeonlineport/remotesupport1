# Roadmap

## Milestone 1 — implemented in this starter

- Host/supporter modes
- Expiring one-time session code
- Explicit accept/reject prompt
- WebRTC screen stream
- Encrypted data channel for pointer/keyboard messages
- Persistent in-session banner and emergency disconnect

## Milestone 2 — native control scaffold implemented

- Windows helper using SendInput (sign binary before public release)
- macOS helper using CGEvent with Accessibility permission (notarize before release)
- Coordinate scaling for Retina/multi-monitor displays
- Secure-attention limitations documented (no UAC/login-screen bypass)
- Local permission indicator and per-session control toggle

## Milestone 3 — production service

- Account authentication and organization roles
- Device enrollment and revocation
- TURN with short-lived credentials
- Audit events and abuse controls
- Windows code signing; macOS hardened runtime and notarization
- Auto-update with signed releases

## Milestone 4 — controlled unattended access

- Local opt-in with explicit device naming
- OS keychain-backed enrollment secret
- Mandatory account MFA and new-device alerts
- Easy revocation and a visible connection notification
