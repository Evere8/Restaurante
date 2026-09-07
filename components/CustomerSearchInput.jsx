'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { User, Search, X } from 'lucide-react'

/**
 * Input de búsqueda autocompletable de clientes registrados.
 *
 * Props:
 * - restaurantId: id del restaurante (requerido)
 * - value: valor actual del input (string)
 * - onChange: (newValue: string) => void  -> se ejecuta al teclear
 * - onSelect: (customer | null) => void   -> se ejecuta cuando el usuario elige un cliente
 * - searchBy: 'nombre' | 'ruc' | 'all'  (por defecto 'all')
 *      - 'nombre': solo busca por nombre/email
 *      - 'ruc':    solo busca por RUC/CI o teléfono
 *      - 'all':    busca por nombre, ruc, teléfono o email
 * - placeholder: texto del placeholder
 * - className: clases extra para el input
 */
export default function CustomerSearchInput({
  restaurantId,
  value,
  onChange,
  onSelect,
  searchBy = 'all',
  placeholder = 'Buscar cliente...',
  className = '',
  inputClassName = ''
}) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!restaurantId) return
    if (!value || value.trim().length < 1) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const term = value.trim()
        let query = supabase
          .from('customers')
          .select('id, nombre, ruc, telefono, email, direccion_principal')
          .eq('restaurant_id', restaurantId)
          .limit(8)

        if (searchBy === 'nombre') {
          query = query.or(`nombre.ilike.%${term}%,email.ilike.%${term}%`)
        } else if (searchBy === 'ruc') {
          query = query.or(`ruc.ilike.%${term}%,telefono.ilike.%${term}%`)
        } else {
          query = query.or(
            `nombre.ilike.%${term}%,ruc.ilike.%${term}%,telefono.ilike.%${term}%,email.ilike.%${term}%`
          )
        }

        const { data } = await query
        setResults(data || [])
      } catch (err) {
        console.error('Error buscando clientes:', err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, restaurantId, searchBy])

  const handleSelect = (customer) => {
    if (typeof onSelect === 'function') onSelect(customer)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          value={value || ''}
          onChange={(e) => {
            onChange?.(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`pl-8 ${inputClassName}`}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange?.('')
              setResults([])
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            aria-label="Limpiar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (results.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">Buscando...</div>
          )}
          {!loading && results.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-100 last:border-0 flex items-start gap-2"
            >
              <User className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-900 truncate">{c.nombre}</div>
                <div className="text-xs text-gray-500 flex flex-wrap gap-x-2">
                  {c.ruc && <span>RUC: {c.ruc}</span>}
                  {c.telefono && <span>Tel: {c.telefono}</span>}
                </div>
              </div>
            </button>
          ))}
          {!loading && results.length === 0 && value && value.length > 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
          )}
        </div>
      )}
    </div>
  )
}
