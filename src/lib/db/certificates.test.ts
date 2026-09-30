import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb } from "@/lib/db/client";
import { getCertificate, getOrCreateCertificate, SYLLABUS_TITLE } from "@/lib/db/certificates";

beforeEach(async () => {
  await resetDb();
  await addUser("s1");
});
after(closeDb);

test("a student's certificate is minted once and keeps its id", async () => {
  const a = await getOrCreateCertificate("s1", "Бат");
  const b = await getOrCreateCertificate("s1", "Өөр нэр");
  assert.deepEqual(b, a);
  assert.match(a.id, /^[A-Za-z0-9]{20}$/);
  assert.equal(a.uid, "s1");
  assert.equal(a.name, "Бат");
  assert.equal(a.syllabus, SYLLABUS_TITLE);
  assert.match(a.issued_at, /^\d{4}-\d{2}-\d{2}$/);
});

test("concurrent requests still mint a single certificate", async () => {
  const [a, b] = await Promise.all([
    getOrCreateCertificate("s1", "Бат"),
    getOrCreateCertificate("s1", "Бат"),
  ]);
  assert.equal(a.id, b.id);
});

test("getCertificate finds by id and rejects unknown or malformed ids", async () => {
  const cert = await getOrCreateCertificate("s1", "Бат");
  assert.deepEqual(await getCertificate(cert.id), cert);
  assert.equal(await getCertificate("AAAAAAAAAAAAAAAAAAAA"), null);
  assert.equal(await getCertificate("bad id!"), null);
});
