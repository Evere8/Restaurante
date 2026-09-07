'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'

/**
 * Botón que usa el color secundario del tema del admin
 * Reemplaza los botones con bg-orange-500
 */
export function ThemedButton({ children, className = '', style = {}, ...props }) {
  const { colors } = useTheme()
  
  return (
    <Button
      className={`hover:opacity-90 ${className}`}
      style={{ 
        backgroundColor: colors.secondary, 
        color: 'white',
        ...style 
      }}
      {...props}
    >
      {children}
    </Button>
  )
}

/**
 * Botón que usa el color primario del tema (para sidebar y elementos destacados)
 */
export function ThemedButtonPrimary({ children, className = '', style = {}, ...props }) {
  const { colors } = useTheme()
  
  return (
    <Button
      className={`hover:opacity-90 ${className}`}
      style={{ 
        backgroundColor: colors.primary, 
        color: 'white',
        ...style 
      }}
      {...props}
    >
      {children}
    </Button>
  )
}

export default ThemedButton
