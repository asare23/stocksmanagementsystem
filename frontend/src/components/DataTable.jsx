// Minimal, dependency-free data table: columns = [{ key, header, render? }]
export default function DataTable({
  columns,
  rows,
  keyField = "id",
  emptyLabel = "No records found",
  onRowClick,
}) {
  if (!rows?.length) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">{emptyLabel}</div>
    );
  }
  return (
    <div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <button
            type="button"
            key={row[keyField]}
            onClick={() => onRowClick?.(row)}
            disabled={!onRowClick}
            className="w-full border-t border-gray-200 px-4 py-3 text-left disabled:text-gray-900"
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-1 text-sm"
              >
                <span className="font-medium text-gray-500">
                  {column.header}
                </span>
                <span className="min-w-0 break-words text-right text-gray-900">
                  {column.render ? column.render(row) : row[column.key]}
                </span>
              </div>
            ))}
          </button>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer" : ""}
              >
                {columns.map((c) => (
                  <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
