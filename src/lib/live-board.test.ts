import { test } from "node:test";
import assert from "node:assert/strict";
import type { Contest } from "@/lib/db/contests";
import {
  divisionShape,
  formatDuration,
  homeBoard,
  liveView,
  publicName,
  rowKeys,
  seriesMembers,
  type LiveSnapshot,
} from "./live-board";

const T0 = Date.parse("2026-11-28T02:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function mk(id: string, starts_at: number, ends_at: number, extra: Partial<Contest> = {}): Contest {
  return {
    id,
    title: id,
    description: "",
    starts_at,
    ends_at,
    requires_approval: true,
    series: null,
    grade_min: null,
    grade_max: null,
    is_public: true,
    ...extra,
  };
}

test("publicName keeps the first word and initials the rest", () => {
  assert.equal(publicName("Бат Болд"), "Бат Б.");
  assert.equal(publicName("Мөнх-Оргил Түвшин Бат"), "Мөнх-Оргил Т. Б.");
  assert.equal(publicName("  Сараа   Дорж "), "Сараа Д.");
  assert.equal(publicName("Г.Бат"), "Г.Бат");
  assert.equal(publicName(""), "Оролцогч");
  assert.equal(publicName(null), "Оролцогч");
});

test("formatDuration", () => {
  assert.equal(formatDuration(2 * DAY + 4 * HOUR + 59 * 60_000), "2 өдөр 4 цаг");
  assert.equal(formatDuration(HOUR + 24 * 60_000 + 37_000), "01:24:37");
  assert.equal(formatDuration(-5), "00:00:00");
});

test("homeBoard: running public contests win; private ones never show", () => {
  const run = mk("run", T0 - HOUR, T0 + HOUR);
  const hidden = mk("hidden", T0 - HOUR, T0 + HOUR, { is_public: false });
  const soon = mk("soon", T0 + DAY, T0 + DAY + HOUR);
  const b = homeBoard([run, hidden, soon], T0);
  assert.deepEqual(b.running.map((g) => g.contests.map((c) => c.id)), [["run"]]);
  assert.equal(b.upcoming, null);
  assert.equal(b.finished, null);
});

test("homeBoard: window edges are inclusive", () => {
  const at14 = mk("at14", T0 + 14 * DAY, T0 + 14 * DAY + HOUR);
  const past3 = mk("past3", T0 - 3 * DAY - HOUR, T0 - 3 * DAY);
  const b = homeBoard([at14, past3], T0);
  assert.equal(b.upcoming?.contests[0].id, "at14");
  assert.equal(b.finished?.contests[0].id, "past3");
  const late = homeBoard([mk("x", T0 + 14 * DAY + 1, T0 + 15 * DAY), mk("y", T0 - 4 * DAY, T0 - 3 * DAY - 1)], T0);
  assert.deepEqual(late, { running: [], upcoming: null, finished: null });
});

test("homeBoard groups a series and drops its private divisions", () => {
  const s = { series: "Намар" };
  const b = homeBoard(
    [
      mk("open", T0 - HOUR, T0 + HOUR, { ...s }),
      mk("jr", T0 - HOUR, T0 + HOUR, { ...s, grade_min: 6, grade_max: 7 }),
      mk("priv", T0 - HOUR, T0 + HOUR, { ...s, grade_min: 8, grade_max: 10, is_public: false }),
    ],
    T0
  );
  assert.deepEqual(b.running.map((g) => [g.series, g.contests.map((c) => c.id)]), [["Намар", ["jr", "open"]]]);
});

test("seriesMembers skips private siblings and refuses a private anchor", () => {
  const s = { series: "Намар" };
  const all = [
    mk("a", T0, T0 + HOUR, { ...s, grade_min: 8, grade_max: 10 }),
    mk("b", T0, T0 + HOUR, { ...s, grade_min: 6, grade_max: 7 }),
    mk("p", T0, T0 + HOUR, { ...s, is_public: false }),
    mk("solo", T0, T0 + HOUR),
  ];
  assert.deepEqual(seriesMembers(all, "a")?.map((c) => c.id), ["b", "a"]);
  assert.deepEqual(seriesMembers(all, "solo")?.map((c) => c.id), ["solo"]);
  assert.equal(seriesMembers(all, "p"), null);
  assert.equal(seriesMembers(all, "nope"), null);
});

const snap: LiveSnapshot = {
  contest: mk("cup", T0, T0 + 3 * HOUR),
  problems: [{ id: "p1", points: 100, title: "Нийлбэр" }],
  participants: [
    { uid: "u1", name: "Бат Болд", class_name: "7А", scores: { p1: 100 }, total: 100, last_improved_at: T0 + HOUR },
    { uid: "u2", name: "Сараа Дорж", class_name: "6Б", scores: {}, total: 0, last_improved_at: null },
  ],
  events: [{ uid: "u1", problem_id: "p1", score: 100, submitted_at: T0 + HOUR }],
};

test("liveView: anonymous viewers get short names and no uids", () => {
  const v = liveView(snap, { uid: null }, T0 + 2 * HOUR);
  assert.deepEqual(v.rows.map((r) => r.name), ["Бат Б.", "Сараа Д."]);
  assert.deepEqual(v.race.map((s) => s.name), ["Бат Б."]);
  const json = JSON.stringify(v);
  assert.equal(json.includes("u1") || json.includes("u2"), false);
  assert.equal(json.includes("Болд") || json.includes("Дорж"), false);
});

test("liveView: signed-in viewers get full names and their own mark", () => {
  const v = liveView(snap, { uid: "u2" }, T0 + 2 * HOUR);
  assert.deepEqual(v.rows.map((r) => [r.name, r.mine]), [["Бат Болд", false], ["Сараа Дорж", true]]);
});

test("liveView never exposes the teacher's problem ids", () => {
  const secret: LiveSnapshot = {
    ...snap,
    problems: [{ id: "fib-secret", points: 100, title: "Фибоначчи" }],
    participants: [{ ...snap.participants[0], scores: { "fib-secret": 70 }, total: 70 }],
    events: [{ uid: "u1", problem_id: "fib-secret", score: 70, submitted_at: T0 + HOUR }],
  };
  const v = liveView(secret, { uid: null }, T0 - 1);
  assert.equal(JSON.stringify(v).includes("fib-secret"), false);
  assert.equal(v.rows[0].scores[v.problems[0].id], 70);
});

test("homeBoard splits a series whose divisions run at different times", () => {
  const s = { series: "Намар" };
  const jr = mk("jr", T0, T0 + 2 * HOUR, { ...s, grade_min: 6, grade_max: 7 });
  const sr = mk("sr", T0 + 4 * HOUR, T0 + 6 * HOUR, { ...s, grade_min: 11, grade_max: 12 });
  const b = homeBoard([jr, sr], T0 + 3 * HOUR);
  assert.deepEqual(b.upcoming?.contests.map((c) => c.id), ["sr"]);
  assert.deepEqual(b.finished?.contests.map((c) => c.id), ["jr"]);
});

test("a reused series name does not pull in last year's divisions", () => {
  const s = { series: "Олимпиад" };
  const now = mk("now", T0, T0 + HOUR, { ...s, grade_min: 6, grade_max: 7 });
  const old = mk("old", T0 - 365 * DAY, T0 - 365 * DAY + HOUR, { ...s, grade_min: 8, grade_max: 10 });
  assert.deepEqual(seriesMembers([now, old], "now")?.map((c) => c.id), ["now"]);
  assert.deepEqual(homeBoard([now, old], T0 - DAY).upcoming?.contests.map((c) => c.id), ["now"]);
});

test("liveView hides problem titles before the start", () => {
  assert.equal(liveView(snap, { uid: null }, T0 - 1).problems[0].title, null);
  assert.equal(liveView(snap, { uid: null }, T0 + 1).problems[0].title, "Нийлбэр");
});

test("liveView: a row's key follows the student between refreshes and viewers, without the uid", () => {
  const visitor = liveView(snap, { uid: null }, T0 + 2 * HOUR);
  const student = liveView(snap, { uid: "u2" }, T0 + 2 * HOUR);
  const keys = visitor.rows.map((r) => r.key);
  assert.deepEqual(student.rows.map((r) => r.key), keys);
  assert.notEqual(keys[0], keys[1]);
  // Sara overtakes Bat: the keys move with them.
  const swapped = liveView({ ...snap, participants: [...snap.participants].reverse() }, { uid: null }, T0 + 2 * HOUR);
  assert.deepEqual(swapped.rows.map((r) => r.key), [keys[1], keys[0]]);
  for (const key of keys) assert.match(key, /^[0-9a-z_]+$/);
});

test("rowKeys: unique, even for a repeated id", () => {
  const [a, b] = rowKeys("cup", ["u1", "u1"]);
  assert.notEqual(a, b);
  assert.deepEqual(rowKeys("cup", ["u1"]), [a]);
});

test("divisionShape: the division's place in its series picks one of the seven shapes", () => {
  const members = ["d67", "d8", "d9", "d10", "d11", "d12", "fans", "extra"].map((id) => ({ id }));
  assert.deepEqual(members.map((m) => divisionShape(members, m.id)), [0, 1, 2, 3, 4, 5, 6, 0]);
  assert.equal(divisionShape(members, "unknown"), 0);
});
