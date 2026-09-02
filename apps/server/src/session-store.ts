import { randomInt } from "node:crypto";

export interface SessionRecord<T> {
  code: string;
  host: T;
  createdAt: number;
  supporter?: T;
}

export class SessionStore<T> {
  private readonly sessions = new Map<string, SessionRecord<T>>();

  constructor(private readonly ttlMs = 10 * 60_000) {}

  create(host: T, now = Date.now()): SessionRecord<T> {
    this.sweep(now);
    let code = "";
    do code = String(randomInt(100_000, 1_000_000));
    while (this.sessions.has(code));
    const session = { code, host, createdAt: now };
    this.sessions.set(code, session);
    return session;
  }

  join(code: string, supporter: T, now = Date.now()): SessionRecord<T> | undefined {
    const session = this.get(code, now);
    if (!session || session.supporter) return undefined;
    session.supporter = supporter;
    return session;
  }

  get(code: string, now = Date.now()): SessionRecord<T> | undefined {
    const session = this.sessions.get(code);
    if (!session) return undefined;
    if (now - session.createdAt >= this.ttlMs) {
      this.sessions.delete(code);
      return undefined;
    }
    return session;
  }

  remove(code: string): void { this.sessions.delete(code); }

  removeByMember(member: T): { code: string; peer?: T } | undefined {
    for (const [code, session] of this.sessions) {
      if (session.host === member || session.supporter === member) {
        const peer = session.host === member ? session.supporter : session.host;
        this.sessions.delete(code);
        return { code, peer };
      }
    }
    return undefined;
  }

  sweep(now = Date.now()): void {
    for (const [code, session] of this.sessions)
      if (now - session.createdAt >= this.ttlMs) this.sessions.delete(code);
  }
}
