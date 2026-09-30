/** Cells starting with these run as formulas when Excel opens the file. */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** RFC 4180 rows with CRLF line ends. The UTF-8 BOM is the caller's to add. */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  return rows.map((row) => row.map(cell).join(",") + "\r\n").join("");
}
