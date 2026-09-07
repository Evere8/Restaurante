'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const NotificationSoundContext = createContext(null)

export function NotificationSoundProvider({ children }) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [restaurantId, setRestaurantId] = useState(null)
  const [lastOrderCount, setLastOrderCount] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const checkIntervalRef = useRef(null)

  // Cargar preferencias y datos del usuario
  useEffect(() => {
    const initializeSound = async () => {
      // Verificar si hay sesión de admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener restaurante del usuario
      const { data: userData } = await supabase
        .from('users')
        .select('restaurant_id, role')
        .eq('id', user.id)
        .single()

      if (userData?.restaurant_id) {
        setRestaurantId(userData.restaurant_id)
        setIsAdmin(['admin', 'gerente', 'mozo', 'cocina'].includes(userData.role))
        
        // Cargar preferencia de sonido
        const saved = localStorage.getItem(`sound_enabled_${userData.restaurant_id}`)
        if (saved !== null) {
          setSoundEnabled(saved === 'true')
        }
      }
    }

    initializeSound()
  }, [])

  // Función para reproducir sonido de notificación
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      const playTone = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime + startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration)
        
        oscillator.start(audioContext.currentTime + startTime)
        oscillator.stop(audioContext.currentTime + startTime + duration)
      }
      
      // Secuencia de tonos para sonido notorio
      const tones = [
        { freq: 880, start: 0, duration: 0.3 },
        { freq: 988, start: 0.35, duration: 0.3 },
        { freq: 1047, start: 0.7, duration: 0.4 },
        { freq: 880, start: 1.2, duration: 0.3 },
        { freq: 988, start: 1.55, duration: 0.3 },
        { freq: 1175, start: 1.9, duration: 0.5 }
      ]
      
      tones.forEach(tone => playTone(tone.freq, tone.start, tone.duration))
    } catch (error) {
      console.error('Error reproduciendo sonido:', error)
    }
  }, [soundEnabled])

  // Polling para detectar nuevos pedidos
  useEffect(() => {
    if (!restaurantId || !isAdmin) return

    const checkNewOrders = async () => {
      try {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .in('estado', ['PENDIENTE', 'NUEVO'])

        if (lastOrderCount !== null && count > lastOrderCount) {
          // Hay nuevos pedidos, reproducir sonido
          playNotificationSound()
          
          // También mostrar notificación del navegador si está permitido
          if (Notification.permission === 'granted') {
            new Notification('🍽️ Nuevo Pedido', {
              body: `Tienes ${count - lastOrderCount} nuevo(s) pedido(s)`,
              icon: '/favicon.ico',
              tag: 'new-order'
            })
          }
        }
        
        setLastOrderCount(count)
      } catch (error) {
        console.error('Error verificando nuevos pedidos:', error)
      }
    }

    // Solicitar permiso de notificaciones
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }

    // Verificar inmediatamente y luego cada 5 segundos
    checkNewOrders()
    checkIntervalRef.current = setInterval(checkNewOrders, 5000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [restaurantId, isAdmin, lastOrderCount, playNotificationSound])

  // Toggle del sonido
  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    if (restaurantId) {
      localStorage.setItem(`sound_enabled_${restaurantId}`, String(newValue))
    }
    return newValue
  }, [soundEnabled, restaurantId])

  // Probar sonido manualmente
  const testSound = useCallback(() => {
    playNotificationSound()
  }, [playNotificationSound])

  const value = {
    soundEnabled,
    toggleSound,
    testSound,
    playNotificationSound
  }

  return (
    <NotificationSoundContext.Provider value={value}>
      {children}
    </NotificationSoundContext.Provider>
  )
}

export function useNotificationSound() {
  const context = useContext(NotificationSoundContext)
  if (!context) {
    // Si no hay contexto, devolver valores por defecto (para páginas públicas)
    return {
      soundEnabled: false,
      toggleSound: () => false,
      testSound: () => {},
      playNotificationSound: () => {}
    }
  }
  return context
}
