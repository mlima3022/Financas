export const qs = (sel, ctx = document) => ctx.querySelector(sel);
export const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export function formatCurrency(value, currency = "BRL") {
  const num = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(num);
}

export function formatDate(value) {
  if (!value) return "";
  const dt = new Date(value);
  return dt.toLocaleDateString("pt-BR");
}

export function toast(message, type = "info") {
  const container = qs("#toastContainer");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export function parseCSV(text) {
  const rows = text.split(/\r?\n/).filter(Boolean);
  return rows.map(line => line.split(",").map(c => c.trim()));
}

export function toCSV(rows) {
  return rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}
