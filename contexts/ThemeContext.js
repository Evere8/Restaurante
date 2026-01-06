'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

const defaultColors = {
  primary: '#f97316',
  secondary: '#1e3a5f'
}

const ThemeContext = createContext({
  colors: defaultColors,
  loaded: false
})

export function ThemeProvider({ children }) {
  const [colors, setColors] = useState(defaultColors)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadColors = () => {
      const savedColors = localStorage.getItem('adminColors')
      if (savedColors) {
        try {
          const parsed = JSON.parse(savedColors)
          setColors({
            primary: parsed.primary || defaultColors.primary,
            secondary: parsed.secondary || defaultColors.secondary
          })
        } catch (e) {
          console.error('Error parsing admin colors:', e)
        }
      }
      setLoaded(true)
    }
    
    loadColors()
    
    // Escuchar cambios en localStorage
    const handleStorage = (e) => {
      if (e.key === 'adminColors') {
        loadColors()
      }
    }
    
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return (
    <ThemeContext.Provider value={{ colors, loaded }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    return { colors: defaultColors, loaded: false }
  }
  return context
}

export default ThemeContext
