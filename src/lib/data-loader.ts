import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

function normalizeRows(raw: Record<string, unknown>[], headers: string[]): Record<string, string>[] {
  return raw.map((r) => {
    const out: Record<string, string> = {};
    for (const h of headers) {
      const v = r[h];
      out[h] = v === undefined || v === null ? "" : String(v).trim();
    }
    return out;
  });
}

export async function parseDataFile(file: File): Promise<ParsedData> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const headers = (res.meta.fields ?? []).filter(Boolean) as string[];
          resolve({ headers, rows: normalizeRows(res.data, headers) });
        },
        error: (err) => reject(err),
      });
    });
  }
  // Excel
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = json.length ? Object.keys(json[0]) : [];
  return { headers, rows: normalizeRows(json, headers) };
}