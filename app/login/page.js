'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userType, setUserType] = useState('CLIENTE')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const result = await login(email, password, userType)
    
    if (result.success) {
      toast.success('¡Bienvenido!')
      if (result.user.rol === 'DESARROLLADOR') {
        router.push('/panel-desarrollador')
      } else {
        router.push('/dashboard')
      }
    } else {
      toast.error(result.error || 'Error al iniciar sesión')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1 text-center bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold">CRM Restaurante</CardTitle>
          <CardDescription className="text-orange-100">
            Inicia sesión para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Usuario</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={userType === 'CLIENTE' ? 'default' : 'outline'}
                  onClick={() => setUserType('CLIENTE')}
                  className={userType === 'CLIENTE' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  Cliente
                </Button>
                <Button
                  type="button"
                  variant={userType === 'DESARROLLADOR' ? 'default' : 'outline'}
                  onClick={() => setUserType('DESARROLLADOR')}
                  className={userType === 'DESARROLLADOR' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  Desarrollador
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loading}
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-orange-50 rounded-lg text-sm text-gray-700">
            <p className="font-semibold mb-2">👤 Usuarios Demo:</p>
            <p className="mb-1"><strong>Admin:</strong> admin@demo.com / admin123</p>
            <p><strong>Dev:</strong> dev@demo.com / dev123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
