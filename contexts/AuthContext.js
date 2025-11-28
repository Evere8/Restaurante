'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const savedUser = localStorage.getItem('crm_user')
      const savedRestaurant = localStorage.getItem('crm_restaurant')
      
      if (savedUser && savedRestaurant) {
        setUser(JSON.parse(savedUser))
        setRestaurant(JSON.parse(savedRestaurant))
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password, userType = 'CAJERO') => {
    try {
      // Buscar usuario en la tabla users
      const { data: users, error } = await supabase
        .from('users')
        .select('*, restaurants(*)')
        .eq('email', email)
        .eq('activo', true)

      if (error) throw error
      if (!users || users.length === 0) {
        throw new Error('Usuario no encontrado')
      }

      const userData = users[0]

      // Verificar contraseña (en producción deberías usar bcrypt)
      if (userData.password !== password) {
        throw new Error('Contraseña incorrecta')
      }

      // Verificar tipo de usuario
      if (userType === 'DESARROLLADOR' && userData.rol !== 'DESARROLLADOR') {
        throw new Error('No tienes permisos de desarrollador')
      }

      if (userType === 'CLIENTE' && userData.rol === 'DESARROLLADOR') {
        throw new Error('Debes iniciar como desarrollador')
      }

      // Verificar que el restaurante esté activo
      if (userData.restaurants && !userData.restaurants.activo && userData.rol !== 'DESARROLLADOR') {
        throw new Error('Tu cuenta ha sido desactivada. Por favor contacta a soporte.')
      }

      // Verificar que el restaurante no esté en mantenimiento
      if (userData.restaurants && userData.restaurants.en_mantenimiento && userData.rol !== 'DESARROLLADOR') {
        throw new Error('Restaurante en mantenimiento')
      }

      // Actualizar último login
      await supabase
        .from('users')
        .update({ ultimo_login: new Date().toISOString() })
        .eq('id', userData.id)

      const userToSave = {
        id: userData.id,
        nombre: userData.nombre,
        email: userData.email,
        rol: userData.rol,
        restaurant_id: userData.restaurant_id
      }

      setUser(userToSave)
      setRestaurant(userData.restaurants)
      
      localStorage.setItem('crm_user', JSON.stringify(userToSave))
      localStorage.setItem('crm_restaurant', JSON.stringify(userData.restaurants))

      return { success: true, user: userToSave }
    } catch (error) {
      console.error('Error en login:', error)
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    setUser(null)
    setRestaurant(null)
    localStorage.removeItem('crm_user')
    localStorage.removeItem('crm_restaurant')
    router.push('/login')
  }

  const value = {
    user,
    restaurant,
    loading,
    login,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
