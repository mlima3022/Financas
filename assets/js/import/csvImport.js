import { parseCSV } from "../utils.js";

export function previewCSV(file, onPreview) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(reader.result);
    onPreview(rows);
  };
  reader.readAsText(file);
}

export function mapColumns(headers, mapping) {
  const map = {};
  headers.forEach((h, idx) => {
    const target = mapping[h];
    if (target) map[target] = idx;
  });
  return map;
}

export function transformRows(rows, map) {
  return rows.slice(1).map(r => ({
    date: r[map.date],
    description: r[map.description],
    amount: Number(r[map.amount] || 0),
    type: r[map.type] || "expense"
  }));
}
