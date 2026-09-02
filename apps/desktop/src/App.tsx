import { useEffect, useRef, useState } from "react";

type Mode = "home" | "host" | "supporter";
type Status = "idle" | "waiting" | "approval" | "connecting" | "connected" | "ended";
const SIGNAL_URL = import.meta.env.VITE_SIGNAL_URL ?? "ws://localhost:8787";
const ICE = [{ urls: "stun:stun.l.google.com:19302" }];

export function App() {
  const [mode, setMode] = useState<Mode>("home");
  const [status, setStatus] = useState<Status>("idle");
  const [code, setCode] = useState("");
  const [typedCode, setTypedCode] = useState("");
  const [notice, setNotice] = useState("Ready for a secure support session");
  const [unattended, setUnattended] = useState(false);
  const ws = useRef<WebSocket | undefined>(undefined);
  const peer = useRef<RTCPeerConnection | undefined>(undefined);
  const channel = useRef<RTCDataChannel | undefined>(undefined);
  const video = useRef<HTMLVideoElement>(null);

  function socket(): WebSocket {
    if (ws.current?.readyState === WebSocket.OPEN) return ws.current;
    const next = new WebSocket(SIGNAL_URL);
    ws.current = next;
    next.onmessage = (event) => void onMessage(JSON.parse(event.data));
    next.onclose = () => status === "connected" && end("Connection lost");
    return next;
  }

  function send(message: unknown) {
    const active = socket();
    if (active.readyState === WebSocket.OPEN) active.send(JSON.stringify(message));
    else active.addEventListener("open", () => active.send(JSON.stringify(message)), { once: true });
  }

  async function createPeer(isSupporter: boolean, sessionCode: string): Promise<RTCPeerConnection> {
    peer.current?.close();
    const pc = new RTCPeerConnection({ iceServers: ICE });
    peer.current = pc;
    pc.onicecandidate = ({ candidate }) => candidate && send({ type: "signal", code: sessionCode, payload: { candidate } });
    pc.ontrack = ({ streams }) => { if (video.current) video.current.srcObject = streams[0]; };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("connected");
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) end("Session ended");
    };
    if (isSupporter) {
      channel.current = pc.createDataChannel("control");
    } else {
      pc.ondatachannel = ({ channel: remoteChannel }) => {
        channel.current = remoteChannel;
        remoteChannel.onmessage = ({ data }) => void window.remoteNative.input(JSON.parse(data));
      };
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      if (video.current) video.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }
    return pc;
  }

  async function onMessage(message: any) {
    if (message.type === "code") { setCode(message.code); setStatus("waiting"); setNotice("Share this code with your support agent"); }
    if (message.type === "join-request") { setCode(message.code); setStatus("approval"); setNotice("A support agent wants to connect"); }
    if (message.type === "waiting") { setCode(message.code); setStatus("waiting"); setNotice("Waiting for customer approval"); }
    if (message.type === "decision" && message.accepted) {
      setStatus("connecting");
      const pc = await createPeer(true, message.code);
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      send({ type: "signal", code: message.code, payload: { description: offer } });
    }
    if (message.type === "decision" && !message.accepted) end("Customer declined the request");
    if (message.type === "signal") {
      const pc = peer.current ?? await createPeer(mode === "supporter", message.code);
      if (message.payload.description) {
        await pc.setRemoteDescription(message.payload.description);
        if (message.payload.description.type === "offer") {
          const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
          send({ type: "signal", code: message.code, payload: { description: answer } });
        }
      }
      if (message.payload.candidate) await pc.addIceCandidate(message.payload.candidate);
    }
    if (message.type === "leave" || message.type === "error") end(message.message ?? "Session ended");
  }

  function startHost() { setMode("host"); setNotice("Creating a one-time support code"); send({ type: "host" }); }
  function startSupport() {
    const clean = typedCode.replace(/\D/g, "");
    if (clean.length !== 6) return setNotice("Enter the 6-digit customer code");
    setMode("supporter"); setCode(clean); setNotice("Requesting customer approval"); send({ type: "join", code: clean });
  }
  async function decide(accepted: boolean) {
    if (!accepted) return end("Request declined");
    const permission = await window.remoteNative.setControl(true);
    if (!permission.enabled) {
      setNotice(permission.reason ?? "Remote-control permission is required");
      return;
    }
    send({ type: "decision", code, accepted: true });
    setStatus("connecting"); setNotice("Choose the screen you want to share");
  }
  function end(reason = "Session ended") {
    if (code) send({ type: "leave", code });
    void window.remoteNative.setControl(false);
    peer.current?.close(); peer.current = undefined; channel.current = undefined;
    setStatus("ended"); setNotice(reason);
  }
  function reset() { setMode("home"); setStatus("idle"); setCode(""); setTypedCode(""); setNotice("Ready for a secure support session"); }

  function control(kind: string, event: React.MouseEvent | React.KeyboardEvent) {
    if (mode !== "supporter" || status !== "connected" || channel.current?.readyState !== "open") return;
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const payload = kind === "key" ? { kind, key: (event as React.KeyboardEvent).key } : {
      kind, x: ((event as React.MouseEvent).clientX - rect.left) / rect.width,
      y: ((event as React.MouseEvent).clientY - rect.top) / rect.height,
      button: (event as React.MouseEvent).button
    };
    channel.current.send(JSON.stringify(payload));
  }

  useEffect(() => () => { peer.current?.close(); ws.current?.close(); }, []);

  return <main>
    {status === "connected" && <div className="session-banner"><span className="live-dot" /> Remote support is active <button onClick={() => end()}>Disconnect now</button></div>}
    <header><div className="brand-mark">R</div><div><b>Remote Support</b><small>Consent-first assistance</small></div><span className="secure">● Secure session</span></header>
    <section className="shell">
      <div className="hero"><p className="eyebrow">FAST · PRIVATE · CONTROLLED</p><h1>Help is one secure<br/>connection away.</h1><p>{notice}</p></div>
      <div className="card">
        {mode === "home" && <>
          <h2>Start a session</h2><p className="muted">The customer stays in control at every step.</p>
          <button className="primary" onClick={startHost}>Receive support <span>→</span></button>
          <div className="divider"><span>or enter a code</span></div>
          <div className="code-row"><input aria-label="Session code" inputMode="numeric" maxLength={6} value={typedCode} onChange={e => setTypedCode(e.target.value)} placeholder="000 000"/><button onClick={startSupport}>Connect</button></div>
          <label className="toggle"><input type="checkbox" checked={unattended} onChange={e => setUnattended(e.target.checked)}/><span/> Enable unattended access on this device</label>
          {unattended && <p className="warning">Enrollment is locked in this starter until MFA, device secrets, and revocation are configured.</p>}
        </>}
        {mode === "host" && status === "waiting" && <><p className="eyebrow">YOUR ONE-TIME CODE</p><div className="big-code">{code.slice(0,3)} {code.slice(3)}</div><p className="muted">Expires in 10 minutes. Share only with your trusted support agent.</p><button className="secondary" onClick={() => end("Cancelled")}>Cancel</button></>}
        {mode === "host" && status === "approval" && <><div className="shield">✓</div><h2>Allow remote support?</h2><p className="muted">Your screen and mouse/keyboard can be controlled until you disconnect.</p><button className="primary" onClick={() => void decide(true)}>Accept connection</button><button className="secondary" onClick={() => void decide(false)}>Reject</button></>}
        {mode === "supporter" && status === "waiting" && <><div className="spinner"/><h2>Waiting for approval</h2><p className="muted">Code {code}. The customer must accept on their computer.</p><button className="secondary" onClick={() => end("Cancelled")}>Cancel request</button></>}
        {status === "connected" && <div className="viewer" tabIndex={0} onMouseMove={e => control("move", e)} onMouseDown={e => control("down", e)} onMouseUp={e => control("up", e)} onKeyDown={e => control("key", e)}><video ref={video} autoPlay playsInline/><span>{mode === "host" ? "Your screen is being shared" : "Click the screen to send input"}</span></div>}
        {status === "connecting" && <><div className="spinner"/><h2>Securing connection</h2><p className="muted">Establishing the encrypted peer-to-peer session…</p></>}
        {status === "ended" && <><div className="shield">✓</div><h2>Session closed</h2><p className="muted">{notice}. Remote input is disabled.</p><button className="primary" onClick={reset}>Back to home</button></>}
      </div>
    </section>
    <footer><span>🔒 End-to-end encrypted media</span><span>◉ Visible consent</span><span>⌁ One-time codes</span></footer>
  </main>;
}
