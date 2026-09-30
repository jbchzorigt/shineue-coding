import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_FINGERPRINTS,
  comparePython,
  fingerprints,
  preparePython,
  pythonTokens,
  starterFingerprints,
} from "@/lib/plagiarism/python";

const ORIGINAL = `n = int(input())
total = 0
for i in range(n):
    x = int(input())
    if x % 2 == 0:
        total += x
print(total)
`;
const RENAMED = `# my solution
count = int(input())
s = 0
for k in range(count):
    v = int(input())   # read one
    if v % 2 == 0:
        s += v

print(s)
`;
const PADDED = `${RENAMED}
def helper(a):
    return a * 2

extra = [helper(i) for i in range(3)]
print("done", extra)
`;
const UNRELATED = `word = input().strip().lower()
letters = [c for c in word if c.isalpha()]
if letters == letters[::-1]:
    print("YES")
else:
    print("NO")
`;
const OTHER_WAY = `n = int(input())
nums = [int(input()) for _ in range(n)]
print(sum(x for x in nums if x % 2 == 0))
`;
const WHILE_WAY = `n = int(input())
total = 0
i = 0
while i < n:
    v = int(input())
    if v % 2 == 0:
        total = total + v
    i += 1
print(total)
`;
const STARTER = `def solve(numbers):
    # write your code here
    return 0

n = int(input())
numbers = [int(input()) for _ in range(n)]
print(solve(numbers))
`;
const SUM_POSITIVE = STARTER.replace("return 0", "return sum(x for x in numbers if x > 0)");
const EVEN_SUM = STARTER.replace(
  "return 0",
  "total = 0\n    count = 0\n    while count < len(numbers):\n        total = total + numbers[count] * 2\n        count += 1\n    return total // 2"
);
const LARGEST = STARTER.replace(
  "return 0",
  "best = numbers[0]\n    for x in numbers:\n        if x > best:\n            best = x\n    return best"
);

const none = new Set<number>();
function ready(code: string, starter: ReadonlySet<number> = none): Set<number> {
  const fp = preparePython(code, starter);
  assert.ok(fp, "expected a comparable answer");
  return fp;
}

test("pythonTokens drops comments and whitespace and blurs names, strings and numbers", () => {
  assert.deepEqual(pythonTokens('total = int(x)  # sum\ns = f"hi {x}" + 2.5'), [
    "V", "=", "int", "(", "V", ")", "V", "=", "S", "+", "N",
  ]);
  assert.deepEqual(pythonTokens('doc = """a\nb""" ; y = 1.5e3 ** 2 // 3'), [
    "V", "=", "S", ";", "V", "=", "N", "**", "N", "//", "N",
  ]);
});

test("names after a dot stay, so methods count but a variable called count does not", () => {
  assert.deepEqual(pythonTokens("count = 0\nnums.append(count)"), [
    "V", "=", "N", "V", ".", "append", "(", "V", ")",
  ]);
});

test("Cyrillic variable names are blurred like Latin ones", () => {
  assert.deepEqual(pythonTokens("нийлбэр = тоо + 1"), ["V", "=", "V", "+", "N"]);
  const mongolian = ORIGINAL.replace(/\bn\b/g, "тоо").replace(/total/g, "нийлбэр").replace(/\bx\b/g, "утга");
  assert.deepEqual(pythonTokens(mongolian), pythonTokens(ORIGINAL));
  assert.equal(comparePython(ready(ORIGINAL), ready(mongolian)), 1);
});

test("renaming, comments and blank lines do not hide a copy", () => {
  assert.equal(comparePython(ready(ORIGINAL), ready(RENAMED)), 1);
});

test("a copy with extra code added still matches", () => {
  assert.ok(comparePython(ready(ORIGINAL), ready(PADDED)) >= 0.9);
});

test("different programs, and different solutions to the same task, stay below 70%", () => {
  assert.ok(comparePython(ready(ORIGINAL), ready(UNRELATED)) < 0.7);
  assert.ok(comparePython(ready(ORIGINAL), ready(OTHER_WAY)) < 0.7);
  assert.ok(comparePython(ready(ORIGINAL), ready(WHILE_WAY)) < 0.7);
});

test("the teacher's starter code is not evidence of copying", () => {
  const starter = starterFingerprints(STARTER);
  assert.ok(comparePython(ready(EVEN_SUM), ready(LARGEST)) >= 0.5);
  assert.ok(comparePython(ready(EVEN_SUM, starter), ready(LARGEST, starter)) < 0.2);
  assert.equal(preparePython(STARTER, starter), null);
  // One line of its own on top of the starter is too little to judge.
  assert.equal(preparePython(SUM_POSITIVE, starter), null);
  const renamed = LARGEST.replace(/best/g, "top");
  assert.equal(comparePython(ready(LARGEST, starter), ready(renamed, starter)), 1);
});

test(`answers with fewer than ${MIN_FINGERPRINTS} fingerprints are not compared`, () => {
  // Tiny tasks: every correct answer looks alike, so they would all be flagged.
  assert.equal(preparePython("print(int(input()) * 2)", none), null);
  assert.equal(preparePython("a = int(input())\nb = int(input())\nprint(a + b)\n", none), null);
  assert.equal(
    preparePython("a = int(input())\nb = int(input())\nc = int(input())\nprint(max(a, b, c))\n", none),
    null
  );
  const minOfThree =
    "a = int(input())\nb = int(input())\nc = int(input())\nm = a\nif b < m:\n    m = b\nif c < m:\n    m = c\nprint(m)\n";
  assert.ok(preparePython(minOfThree, none));
});

test("fewer tokens than one hashed run give no fingerprints", () => {
  assert.equal(fingerprints(["V", "="]).size, 0);
  assert.equal(starterFingerprints(undefined).size, 0);
});
