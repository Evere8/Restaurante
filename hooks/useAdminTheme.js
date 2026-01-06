'use client'

import { useState, useEffect } from 'react'

const defaultColors = {
  primary: '#f97316',
  secondary: '#1e3a5f'
}

export function useAdminTheme() {
  const [colors, setColors] = useState(defaultColors)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
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
  }, [])

  // Helper para obtener estilos de botón primario
  const getPrimaryButtonStyle = () => ({
    backgroundColor: colors.primary,
    color: 'white'
  })

  // Helper para obtener estilos de botón secundario
  const getSecondaryButtonStyle = () => ({
    backgroundColor: colors.secondary,
    color: 'white'
  })

  // Helper para hover del botón primario
  const getPrimaryButtonHoverClass = () => 'hover:opacity-90'
  
  // Helper para hover del botón secundario
  const getSecondaryButtonHoverClass = () => 'hover:opacity-90'

  return {
    colors,
    loaded,
    getPrimaryButtonStyle,
    getSecondaryButtonStyle,
    getPrimaryButtonHoverClass,
    getSecondaryButtonHoverClass
  }
}

export default useAdminTheme
