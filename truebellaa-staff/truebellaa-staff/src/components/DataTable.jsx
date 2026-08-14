/**
 * A tiny, dependency-free data table.
 * columns: [{ key, label, render?(row) }]
 */
export default function DataTable({ columns, rows, keyField = 'id', emptyText = 'Nothing here yet.' }) {
  return (
    <div className="table-wrap">
      <table className="dt">
        <thead>
          <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className="empty-row" colSpan={columns.length}>{emptyText}</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={row[keyField] ?? i}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ value }) {
  const cls = String(value || '').toLowerCase().replace(/\s+/g, '_');
  return <span className={`badge badge-${cls}`}>{value}</span>;
}
