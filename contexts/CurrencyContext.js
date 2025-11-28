'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

const CurrencyContext = createContext()

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency debe usarse dentro de CurrencyProvider')
  }
  return context
}

export function CurrencyProvider({ children }) {
  const { restaurant, user } = useAuth()
  const [currency, setCurrency] = useState('EUR')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (restaurant?.id) {
      loadCurrency()
    } else {
      setLoading(false)
    }
  }, [restaurant])

  const loadCurrency = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('moneda')
        .eq('id', restaurant.id)
        .single()

      if (data && data.moneda) {
        setCurrency(data.moneda)
      }
    } catch (error) {
      console.error('Error cargando moneda:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-'
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    
    switch (currency) {
      case 'EUR':
        return `€${numAmount.toFixed(2)}`
      case 'USD':
        return `$${numAmount.toFixed(2)}`
      case 'PYG':
        return `Gs ${numAmount.toLocaleString('es-PY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      default:
        return `${numAmount.toFixed(2)}`
    }
  }

  const updateCurrency = async (newCurrency) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ moneda: newCurrency })
        .eq('id', restaurant.id)

      if (error) throw error
      
      setCurrency(newCurrency)
      return { success: true }
    } catch (error) {
      console.error('Error actualizando moneda:', error)
      return { success: false, error }
    }
  }

  const value = {
    currency,
    setCurrency,
    formatCurrency,
    updateCurrency,
    loading
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}
