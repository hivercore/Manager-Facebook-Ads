import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
}

const StatCard = ({ title, value, icon: Icon, trend, trendUp }: StatCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trend} so với tháng trước
            </p>
          )}
        </div>
        <div className="p-3 bg-primary-100 rounded-full">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
      </div>
    </div>
  )
}

export default StatCard

