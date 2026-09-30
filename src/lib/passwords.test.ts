import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTempPassword, hashPassword, verifyPassword } from "@/lib/passwords";

test("hashPassword stores scrypt parameters, salt and key", async () => {
  const stored = await hashPassword("correct horse");
  assert.match(stored, /^scrypt\$131072\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
});

test("verifyPassword accepts only the original password", async () => {
  const stored = await hashPassword("correct horse");
  assert.equal(await verifyPassword("correct horse", stored), true);
  assert.equal(await verifyPassword("correct horsE", stored), false);
  assert.equal(await verifyPassword("", stored), false);
});

test("the same password hashes differently each time (random salt)", async () => {
  const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("same", b), true);
});

test("verifyPassword rejects malformed stored values instead of throwing", async () => {
  assert.equal(await verifyPassword("x", "not-a-hash"), false);
  assert.equal(await verifyPassword("x", "bcrypt$1$2$3$4$5"), false);
  assert.equal(await verifyPassword("x", "scrypt$0$8$1$AAAA$AAAA"), false);
});

test("temporary passwords are 5+5 unambiguous characters", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = generateTempPassword();
    assert.match(p, /^[a-km-np-z2-9]{5}-[a-km-np-z2-9]{5}$/);
    seen.add(p);
  }
  assert.equal(seen.size, 200);
});
