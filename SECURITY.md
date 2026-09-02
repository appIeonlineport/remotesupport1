# Security model

## Trust boundary

The signaling server relays WebRTC setup messages but must never receive screen
frames or remote-input data. Those travel over the encrypted peer connection.

## Required invariants

1. A host approval token is created only by a click on the host computer.
2. Input events are ignored before approval and immediately after disconnect.
3. A visible banner remains on screen for the whole controlled session.
4. Unattended access requires a separate local opt-in and device-bound secret.
5. Session codes are random, short lived, single use, and rate limited.
6. Logs contain device/session identifiers but no screen frames, keystrokes,
   clipboard contents, or access secrets.

## Unattended access

The starter UI shows the setting but the feature is intentionally not activated
until authenticated device enrollment, encrypted secret storage, revocation,
and local notification are implemented. Do not turn it into a bypass around
the normal consent flow.

## Reporting

For a production deployment, publish an abuse contact and a vulnerability
reporting address before distributing installers.
