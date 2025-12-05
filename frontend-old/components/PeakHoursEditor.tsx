'use client'

import { useState } from 'react'
import { Plus, Trash2, Zap } from 'lucide-react'

export interface PeakHour {
    start: number
    end: number
    priority: number
}

interface PeakHoursEditorProps {
    peakHours: PeakHour[]
    onChange: (peakHours: PeakHour[]) => void
}

export function PeakHoursEditor({ peakHours, onChange }: PeakHoursEditorProps) {
    const [showAdd, setShowAdd] = useState(false)
    const [newPeak, setNewPeak] = useState<PeakHour>({ start: 12, end: 14, priority: 5 })

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

    const addPeakHour = () => {
        onChange([...peakHours, newPeak])
        setNewPeak({ start: 12, end: 14, priority: 5 })
        setShowAdd(false)
    }

    const removePeakHour = (index: number) => {
        onChange(peakHours.filter((_, i) => i !== index))
    }

    const updatePeakHour = (index: number, field: keyof PeakHour, value: number) => {
        const updated = [...peakHours]
        updated[index] = { ...updated[index], [field]: value }
        onChange(updated)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    <Zap className="inline w-4 h-4 mr-1 text-yellow-500" />
                    Horários de Pico
                </label>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                    Adicionar
                </button>
            </div>

            {/* Existing peak hours */}
            {peakHours.length === 0 && !showAdd && (
                <p className="text-sm text-gray-500 italic">Nenhum horário de pico configurado</p>
            )}

            {peakHours.map((peak, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4">
                            <label className="block text-xs text-gray-600 mb-1">Início</label>
                            <select
                                value={peak.start}
                                onChange={(e) => updatePeakHour(index, 'start', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            >
                                {hours.map((hour) => (
                                    <option key={hour} value={hour}>
                                        {formatHour(hour)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-4">
                            <label className="block text-xs text-gray-600 mb-1">Fim</label>
                            <select
                                value={peak.end}
                                onChange={(e) => updatePeakHour(index, 'end', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            >
                                {hours.map((hour) => (
                                    <option key={hour} value={hour}>
                                        {formatHour(hour)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-3">
                            <label className="block text-xs text-gray-600 mb-1">Prioridade (1-10)</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={peak.priority}
                                onChange={(e) => updatePeakHour(index, 'priority', parseInt(e.target.value) || 5)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="col-span-1 flex items-end">
                            <button
                                onClick={() => removePeakHour(index)}
                                className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover"
                            >
                                <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Add new peak hour */}
            {showAdd && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4">
                            <label className="block text-xs text-gray-600 mb-1">Início</label>
                            <select
                                value={newPeak.start}
                                onChange={(e) => setNewPeak({ ...newPeak, start: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            >
                                {hours.map((hour) => (
                                    <option key={hour} value={hour}>
                                        {formatHour(hour)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-4">
                            <label className="block text-xs text-gray-600 mb-1">Fim</label>
                            <select
                                value={newPeak.end}
                                onChange={(e) => setNewPeak({ ...newPeak, end: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            >
                                {hours.map((hour) => (
                                    <option key={hour} value={hour}>
                                        {formatHour(hour)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-4">
                            <label className="block text-xs text-gray-600 mb-1">Prioridade (1-10)</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={newPeak.priority}
                                onChange={(e) => setNewPeak({ ...newPeak, priority: parseInt(e.target.value) || 5 })}
                                className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={addPeakHour}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                        >
                            Adicionar
                        </button>
                        <button
                            onClick={() => setShowAdd(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {peakHours.length > 0 && (
                <p className="text-xs text-gray-500">
                    💡 Dica: Prioridade mais alta = produtos melhores neste horário
                </p>
            )}
        </div>
    )
}
