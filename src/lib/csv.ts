/** RFC 4180 CSV helpers — no dependencies. ";" by default so French Excel opens files correctly. */
export function toCSV<T extends object>(rows: T[], columns?: { key: keyof T; label: string }[], sep = ";") {
  const cols = columns ?? (rows[0] ? (Object.keys(rows[0]) as (keyof T)[]).map((k) => ({ key: k, label: String(k) })) : []);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join(", ") : String(v);
    return /["\n\r;,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.map((c) => escape(c.label)).join(sep);
  const body = rows.map((r) => cols.map((c) => escape(r[c.key])).join(sep));
  return "\uFEFF" + [header, ...body].join("\r\n");
}

export function parseCSV(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return data.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export function downloadFile(content: BlobPart, filename: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
