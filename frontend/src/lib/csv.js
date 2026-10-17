// Shared by browser exports and the API; quotes, separators and formula-like text stay literal.
export function csvCell(value) {
  const text = String(value ?? "");
  return '"' + (/^\s*[=+@-]/.test(text) ? "'" : "") + text.replace(/"/g, '""') + '"';
}

export const csvRow = values => values.map(csvCell).join(";");
