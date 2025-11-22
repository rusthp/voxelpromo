import { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red'
}

const colorClasses = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    text: 'text-blue-600'
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    text: 'text-green-600'
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    text: 'text-orange-600'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    text: 'text-purple-600'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-500 to-red-600',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    text: 'text-red-600'
  }
}

export function StatsCard({ title, value, icon, color = 'blue' }: StatsCardProps) {
  const colors = colorClasses[color]

  return (
    <div className="glass rounded-xl shadow-lg p-6 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`${colors.iconBg} p-3 rounded-lg`}>
          <div className={colors.iconColor}>
            {icon}
          </div>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
        {title}
      </h3>
      <p className={`text-4xl font-bold ${colors.text}`}>
        {value}
      </p>
    </div>
  )
}
