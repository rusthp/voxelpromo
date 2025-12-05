import { useState } from 'react'
import { X, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface ScheduleModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (date: Date) => Promise<void>
    title: string
}

export function ScheduleModal({ isOpen, onClose, onConfirm, title }: ScheduleModalProps) {
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!date || !time) return

        try {
            setLoading(true)
            const scheduledDate = new Date(`${date}T${time}`)
            await onConfirm(scheduledDate)
            onClose()
        } catch (error) {
            console.error('Error scheduling:', error)
        } finally {
            setLoading(false)
        }
    }

    // Get min date (today)
    const today = new Date().toISOString().split('T')[0]

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-600" />
                        Agendar Publicação
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 mb-6">
                        Defina quando deseja publicar a oferta: <br />
                        <span className="font-medium text-gray-800">{title}</span>
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="date"
                                    required
                                    min={today}
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Horário
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="time"
                                    required
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !date || !time}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md transition-all"
                            >
                                {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
