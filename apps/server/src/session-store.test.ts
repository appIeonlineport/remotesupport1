import assert from "node:assert/strict";
import test from "node:test";
import { SessionStore } from "./session-store.js";

test("creates a six-digit code and allows one supporter", () => {
  const store = new SessionStore<object>();
  const session = store.create({}, 100);
  assert.match(session.code, /^\d{6}$/);
  assert.ok(store.join(session.code, {}, 101));
  assert.equal(store.join(session.code, {}, 102), undefined);
});

test("expires sessions", () => {
  const store = new SessionStore<object>(50);
  const session = store.create({}, 100);
  assert.equal(store.get(session.code, 150), undefined);
});

test("removes a session when either member disconnects", () => {
  const store = new SessionStore<object>();
  const host = {};
  const supporter = {};
  const session = store.create(host, 100);
  store.join(session.code, supporter, 101);
  assert.deepEqual(store.removeByMember(supporter), { code: session.code, peer: host });
  assert.equal(store.get(session.code), undefined);
});
