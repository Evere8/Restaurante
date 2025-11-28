'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut, Home, Utensils, ShoppingCart, ChefHat, CreditCard, Users, Tag, BarChart3, Settings, Code, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const { user, restaurant, logout } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home, permission: 'dashboard' },
    { href: '/menu', label: 'Menú', icon: Utensils, permission: 'menu' },
    { href: '/pedidos', label: 'Pedidos', icon: ShoppingCart, permission: 'pedidos' },
    { href: '/kds', label: 'Cocina', icon: ChefHat, permission: 'kds' },
    { href: '/cobro', label: 'Cobro', icon: CreditCard, permission: 'cobro' },
    { href: '/clientes', label: 'Clientes', icon: Users, permission: 'clientes' },
    { href: '/cupones', label: 'Cupones', icon: Tag, permission: 'cupones' },
    { href: '/reportes', label: 'Reportes', icon: BarChart3, permission: 'reportes' },
    { href: '/configuracion', label: 'Configuración', icon: Settings, permission: 'configuracion' },
  ]

  if (user?.rol === 'DESARROLLADOR') {
    menuItems.push({ href: '/panel-desarrollador', label: 'Panel Dev', icon: Code, permission: 'panel_dev' })
  }

  // Filtrar por permisos del usuario
  const filteredItems = menuItems.filter(item => {
    if (!user?.permisos) return true
    if (Object.keys(user.permisos).length === 0) return true
    return user.permisos[item.permission] !== false
  })

  return (
    <div className="w-64 min-h-screen bg-gradient-to-b from-orange-600 to-orange-700 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-orange-500">
        <h1 className="text-2xl font-bold">{restaurant?.nombre || 'CRM Restaurante'}</h1>
        <p className="text-orange-100 text-sm mt-1">{user?.nombre}</p>
        <p className="text-orange-200 text-xs">{user?.rol}</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all cursor-pointer',
                  isActive 
                    ? 'bg-white text-orange-600 shadow-lg' 
                    : 'hover:bg-orange-500/50 text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-orange-500">
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start text-white hover:bg-orange-500/50"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
