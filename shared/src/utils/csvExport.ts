/**
 * Utility to convert an array of objects to CSV format and trigger browser download
 */
export function exportToCsv(
  filename: string,
  rows: Array<Record<string, any>>,
  columns?: { key: string; label: string }[]
): void {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  // Derive columns if not explicitly provided
  const cols =
    columns ||
    Object.keys(rows[0]).map((k) => ({
      key: k,
      label: k.charAt(0).toUpperCase() + k.slice(1),
    }));

  // Build CSV Header line
  const headerLine = cols.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');

  // Build Data lines
  const dataLines = rows.map((row) =>
    cols
      .map((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(',')
  );

  const csvContent = [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
