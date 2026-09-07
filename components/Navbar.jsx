'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut, Menu as MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
  const { user, restaurant, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/menu', label: 'Menú' },
    { href: '/pedidos', label: 'Pedidos' },
    { href: '/kds', label: 'Cocina (KDS)' },
    { href: '/cobro', label: 'Cobro' },
    { href: '/clientes', label: 'Clientes' },
    { href: '/cupones', label: 'Cupones' },
    { href: '/reportes', label: 'Reportes' },
    { href: '/configuracion', label: 'Configuración' },
  ]

  if (user?.rol === 'DESARROLLADOR') {
    menuItems.push({ href: '/panel-desarrollador', label: 'Panel Dev' })
  }

  return (
    <nav className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-xl font-bold">
              {restaurant?.nombre || 'CRM Restaurante'}
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" className="text-white hover:bg-orange-600">
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:block text-sm">
              <div className="font-semibold">{user?.nombre}</div>
              <div className="text-orange-100 text-xs">{user?.rol}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white hover:bg-orange-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="block py-2 px-4 hover:bg-orange-600 rounded">
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
