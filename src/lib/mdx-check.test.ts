import { test } from "node:test";
import assert from "node:assert/strict";
import { mdxError, normalizeMdx } from "@/lib/mdx-check";

test("normalizeMdx closes void HTML tags and fixes Windows line endings", () => {
  assert.equal(normalizeMdx('# hello world\r\n<img src="test.jpg" alt="end zurag bna">'), '# hello world\n<img src="test.jpg" alt="end zurag bna" />');
  assert.equal(normalizeMdx("a<br>b<br/>c<hr>"), "a<br />b<br />c<hr />");
  assert.equal(normalizeMdx('<img src="a.jpg" />'), '<img src="a.jpg" />');
  assert.equal(normalizeMdx('<img alt="1 > 0" src="a.jpg">'), '<img alt="1 > 0" src="a.jpg" />');
});

test("normalizeMdx leaves code and components alone", () => {
  const code = "```html\n<br>\n<img src=\"x\">\n```\nInline `<br>` too.";
  assert.equal(normalizeMdx(code), code);
  const mdx = '<Callout type="info">\nText\n</Callout>\n\n<GateTable />';
  assert.equal(normalizeMdx(mdx), mdx);
});

test("mdxError accepts valid lessons, including normalized HTML", async () => {
  assert.equal(await mdxError(normalizeMdx('# hi\r\n<img src="a.jpg" alt="x">')), null);
  assert.equal(await mdxError('<Callout type="info">\nText\n</Callout>\n\n| a | b |\n|---|---|\n| 1 | 2 |'), null);
});

test("mdxError explains broken markup in Mongolian with the line", async () => {
  const message = await mdxError("# hi\n\n<div>open");
  assert.ok(message?.startsWith("Агуулгад алдаа байна (3-р мөр)"), message ?? "no error");
  assert.ok(message?.includes("<img … />"));
});
