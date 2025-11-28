import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'CRM Restaurante',
  description: 'Sistema completo de gestión para restaurantes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <CurrencyProvider>
            {children}
            <Toaster position="top-right" richColors />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
