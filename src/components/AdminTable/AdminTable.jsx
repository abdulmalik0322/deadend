import EmptyState from '../EmptyState/EmptyState.jsx';
import './AdminTable.css';

export default function AdminTable({
  columns = [],
  rows = [],
  emptyText = 'No rows to display.',
}) {
  if (!rows.length) {
    return (
      <div className="admin-table-empty">
        <EmptyState icon="folder" title={emptyText} />
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id ?? ri}>
              {columns.map((col) => (
                <td key={col.key} data-label={col.label}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
