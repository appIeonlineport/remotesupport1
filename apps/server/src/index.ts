import { WebSocket, WebSocketServer } from "ws";
import { createServer } from "node:http";
import { SessionStore } from "./session-store.js";

type ClientMessage =
  | { type: "host" }
  | { type: "join"; code: string }
  | { type: "signal"; code: string; payload: unknown }
  | { type: "decision"; code: string; accepted: boolean }
  | { type: "leave"; code: string };

const port = Number(process.env.PORT ?? 8787);
const httpServer = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "remote-support-signal" }));
    return;
  }
  response.writeHead(404).end();
});
const wss = new WebSocketServer({ server: httpServer });
const sessions = new SessionStore<WebSocket>();

function send(ws: WebSocket | undefined, message: unknown): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let message: ClientMessage;
    try { message = JSON.parse(raw.toString()) as ClientMessage; }
    catch { return send(ws, { type: "error", message: "Invalid message" }); }

    if (message.type === "host") {
      const session = sessions.create(ws);
      return send(ws, { type: "code", code: session.code, expiresInSeconds: 600 });
    }

    const code = "code" in message ? message.code.replace(/\D/g, "") : "";
    if (!/^\d{6}$/.test(code)) return send(ws, { type: "error", message: "Invalid session code" });

    if (message.type === "join") {
      const session = sessions.join(code, ws);
      if (!session) return send(ws, { type: "error", message: "Session unavailable" });
      send(session.host, { type: "join-request", code });
      return send(ws, { type: "waiting", code });
    }

    const session = sessions.get(code);
    if (!session || (ws !== session.host && ws !== session.supporter))
      return send(ws, { type: "error", message: "Session unavailable" });

    const peer = ws === session.host ? session.supporter : session.host;
    if (message.type === "signal") send(peer, { type: "signal", code, payload: message.payload });
    if (message.type === "decision") {
      send(session.supporter, { type: "decision", code, accepted: message.accepted });
      if (!message.accepted) sessions.remove(code);
    }
    if (message.type === "leave") {
      send(peer, { type: "leave", code });
      sessions.remove(code);
    }
  });

  ws.on("close", () => {
    const ended = sessions.removeByMember(ws);
    if (ended) send(ended.peer, { type: "leave", code: ended.code });
  });
});

setInterval(() => sessions.sweep(), 60_000).unref();
httpServer.listen(port, () => console.log(`Signaling server listening on ws://localhost:${port}`));
