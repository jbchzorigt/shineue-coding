import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb } from "@/lib/db/client";
import { registerParticipant, upsertContest, type Contest } from "@/lib/db/contests";
import { loadLiveSnapshot } from "@/lib/db/live";

beforeEach(resetDb);
after(closeDb);

const pub: Contest = {
  id: "live-cup",
  title: "Шууд тэмцээн",
  description: "",
  starts_at: Date.parse("2026-11-28T02:00:00Z"),
  ends_at: Date.parse("2026-11-28T05:00:00Z"),
  requires_approval: false,
  series: null,
  grade_min: null,
  grade_max: null,
  is_public: true,
};

test("loadLiveSnapshot is null for unknown and private contests", async () => {
  assert.equal(await loadLiveSnapshot("nope"), null);
  await upsertContest({ ...pub, id: "priv-cup", is_public: false });
  assert.equal(await loadLiveSnapshot("priv-cup"), null);
});

test("loadLiveSnapshot lists approved participants without emails", async () => {
  await upsertContest(pub);
  await addUser("s1", { name: "Бат Болд", class_name: "7А" });
  await registerParticipant(pub.id, { uid: "s1", name: "Бат Болд", email: "s1@shineue.edu.mn" });
  const snap = await loadLiveSnapshot(pub.id);
  assert.equal(snap?.participants[0].name, "Бат Болд");
  assert.equal(JSON.stringify(snap).includes("@shineue.edu.mn"), false);
});
