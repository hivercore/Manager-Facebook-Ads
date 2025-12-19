import { ReactNode } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  sortConfig?: { key: string; direction: 'asc' | 'desc' }
  onSort?: (key: string) => void
  emptyMessage?: string
  mobileCardRender?: (item: T) => ReactNode
}

function DataTable<T extends { id: string }>({
  data,
  columns,
  sortConfig,
  onSort,
  emptyMessage = 'Không có dữ liệu',
  mobileCardRender
}: DataTableProps<T>) {
  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-gray-400" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-primary-600" />
      : <ArrowDown size={14} className="text-primary-600" />
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                  >
                    {column.sortable && onSort ? (
                      <button
                        onClick={() => onSort(column.key)}
                        className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                      >
                        <span>{column.label}</span>
                        {getSortIcon(column.key)}
                      </button>
                    ) : (
                      <span>{column.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                      >
                        {column.render ? column.render(item) : (item as any)[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      {mobileCardRender && (
        <div className="lg:hidden space-y-4">
          {data.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-sm text-gray-500">{emptyMessage}</p>
            </div>
          ) : (
            data.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-4">
                {mobileCardRender(item)}
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}

export default DataTable

