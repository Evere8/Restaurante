'use client'

import { useEffect, useState } from 'react'

export default function OrderTimer({ createdAt, estado, tiempoInicio, tiempoListo }) {
  const [timeElapsed, setTimeElapsed] = useState('')
  const [colorClass, setColorClass] = useState('')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      let referenceTime
      
      // Usar el tiempo apropiado según el estado
      if (estado === 'NUEVO') {
        referenceTime = new Date(createdAt)
      } else if (estado === 'PREPARANDO' && tiempoInicio) {
        referenceTime = new Date(tiempoInicio)
      } else if (estado === 'LISTO' && tiempoListo) {
        referenceTime = new Date(tiempoListo)
      } else {
        referenceTime = new Date(createdAt)
      }
      
      const diffMs = now - referenceTime
      const diffMins = Math.floor(diffMs / 60000)

      const hours = Math.floor(diffMins / 60)
      const mins = diffMins % 60

      let display = ''
      if (hours > 0) {
        display = `${hours}h ${mins}m`
      } else {
        display = `${mins}m`
      }

      setTimeElapsed(display)

      // Colores según tiempo
      if (diffMins < 15) {
        setColorClass('text-green-600 bg-green-50')
      } else if (diffMins < 30) {
        setColorClass('text-yellow-600 bg-yellow-50')
      } else {
        setColorClass('text-red-600 bg-red-50')
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [createdAt, estado, tiempoInicio, tiempoListo])

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-md font-mono text-sm font-semibold ${colorClass}`}>
      ⏱️ {timeElapsed}
    </div>
  )
}
