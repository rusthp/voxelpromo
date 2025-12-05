'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'

interface TimeRangePickerProps {
    startHour: number
    endHour: number
    onChange: (start: number, end: number) => void
    label?: string
}

export function TimeRangePicker({ startHour, endHour, onChange, label }: TimeRangePickerProps) {
    const hours = Array.from({ length: 24 }, (_, i) => i)

    const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

    return (
        <div className="space-y-2">
            {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Hora Início</label>
                    <select
                        value={startHour}
                        onChange={(e) => onChange(parseInt(e.target.value), endHour)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        {hours.map((hour) => (
                            <option key={hour} value={hour}>
                                {formatHour(hour)}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Hora Fim</label>
                    <select
                        value={endHour}
                        onChange={(e) => onChange(startHour, parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        {hours.map((hour) => (
                            <option key={hour} value={hour}>
                                {formatHour(hour)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {startHour <= endHour
                    ? `Postagens das ${formatHour(startHour)} às ${formatHour(endHour)}`
                    : `Postagens das ${formatHour(startHour)} às ${formatHour(endHour)} (passa da meia-noite)`}
            </p>
        </div>
    )
}
