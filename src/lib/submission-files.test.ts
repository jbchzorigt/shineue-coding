import { test } from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync } from "fflate";
import {
  attemptFileName,
  studentStem,
  studentZip,
  studentZipName,
  type FileAttempt,
} from "@/lib/submission-files";

const attempt = (over: Partial<FileAttempt>): FileAttempt => ({
  uid: "s1",
  email: "bat@shineue.edu.mn",
  problem_id: "p1",
  attempt: 1,
  score: 0,
  code: "print(1)\n",
  ...over,
});

test("studentStem: the email's local part, safe for a file name", () => {
  assert.equal(studentStem("Bat.Erdene+x@shineue.edu.mn", "s1"), "Bat.Erdene_x");
  // Nothing usable before the @ → the uid.
  assert.equal(studentStem("бат@x.mn", "uid/7"), "uid_7");
  assert.equal(studentStem("", "..."), "student");
});

test("attemptFileName: student, problem and attempt number; .py, .json for a circuit", () => {
  assert.equal(attemptFileName(attempt({ attempt: 3 }), { kind: "python" }), "bat_p1_oroldlogo-3.py");
  assert.equal(attemptFileName(attempt({}), { kind: "logic" }), "bat_p1_oroldlogo-1.json");
  assert.equal(attemptFileName(attempt({ problem_id: "../x" }), undefined), "bat_x_oroldlogo-1.txt");
});

test("studentZipName: contest and student", () => {
  assert.equal(studentZipName("cup", "bat@x", "s1"), "cup_bat.zip");
});

test("studentZip: a folder per problem in contest order, one exact file per attempt", () => {
  const problems = [
    { id: "p2", order: 2, kind: "logic" as const },
    { id: "p1", order: 1, kind: "python" as const },
  ];
  const zip = studentZip(
    [
      attempt({ attempt: 1, score: 40, code: "# Монгол тайлбар\nprint(1)\n" }),
      attempt({ problem_id: "p2", attempt: 1, score: 0, code: '{"gates":[]}' }),
      attempt({ attempt: 2, score: 100, code: "print(2)\n" }),
      attempt({ problem_id: "gone", attempt: 1, score: 5, code: "x" }),
    ],
    problems
  );
  const files = Object.fromEntries(
    Object.entries(unzipSync(zip)).map(([path, bytes]) => [path, strFromU8(bytes)])
  );
  assert.deepEqual(files, {
    "01-p1/oroldlogo-01_40onoo.py": "# Монгол тайлбар\nprint(1)\n",
    "01-p1/oroldlogo-02_100onoo.py": "print(2)\n",
    "02-p2/oroldlogo-01_0onoo.json": '{"gates":[]}',
    "gone/oroldlogo-01_5onoo.txt": "x",
  });
});
