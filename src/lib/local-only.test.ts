import { test } from "node:test";
import assert from "node:assert/strict";
import { isLocalUrl } from "./local-only";

test("isLocalUrl accepts loopback hosts for http and postgres URLs", () => {
  assert.equal(isLocalUrl("http://localhost:3002"), true);
  assert.equal(isLocalUrl("http://127.0.0.1:3002/login"), true);
  assert.equal(isLocalUrl("postgres://u:p@127.0.0.1:5433/coding"), true);
  assert.equal(isLocalUrl("postgresql://u:p@localhost/coding"), true);
  assert.equal(isLocalUrl("http://[::1]:3000"), true);
});

test("isLocalUrl refuses remote hosts, look-alikes, blanks and garbage", () => {
  assert.equal(isLocalUrl("postgres://u:p@ep-x-pooler.neon.tech/neondb?sslmode=require"), false);
  assert.equal(isLocalUrl("https://coding-ibdp-cs.vercel.app"), false);
  assert.equal(isLocalUrl("http://localhost.evil.com"), false);
  assert.equal(isLocalUrl("postgres://u:p@127.0.0.1.nip.io/db"), false);
  assert.equal(isLocalUrl(""), false);
  assert.equal(isLocalUrl(undefined), false);
  assert.equal(isLocalUrl("not a url"), false);
});
