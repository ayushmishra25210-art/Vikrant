// Generic bordered, government-style data table.
// columns: [{ key, header, render?(row) }]
export default function DataTable({ columns, rows, emptyMessage = 'No records found.', rowKey = (r, i) => r.id ?? i }) {
  return (
    <div className="overflow-x-auto border border-[#D6DAE1] rounded">
      <table className="gov-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-gray-500 py-8">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
