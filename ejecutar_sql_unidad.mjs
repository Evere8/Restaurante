import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function ejecutarSQL() {
  console.log('🔧 Intentando agregar columna unidad_medida...')
  
  // Intentar insertar un registro con unidad_medida para verificar si existe
  const testRestaurantId = '11421b35-f19b-41ca-b9d8-b9cfaa94b80d'
  
  const { data, error } = await supabase
    .from('stock_items')
    .insert([{
      restaurant_id: testRestaurantId,
      nombre: 'TEST_UNIDAD_MEDIDA',
      tipo: 'insumo',
      cantidad: 1,
      unidad_medida: 'kg',
      activo: true
    }])
    .select()
  
  if (error) {
    if (error.message.includes('column "unidad_medida" of relation "stock_items" does not exist')) {
      console.log('❌ La columna unidad_medida NO EXISTE')
      console.log('📝 Ejecuta este SQL en Supabase:')
      console.log("ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS unidad_medida TEXT DEFAULT 'unidad';")
      return false
    } else {
      console.log('Error:', error.message)
      return false
    }
  } else {
    console.log('✅ La columna unidad_medida YA EXISTE')
    // Eliminar el registro de prueba
    await supabase.from('stock_items').delete().eq('nombre', 'TEST_UNIDAD_MEDIDA')
    return true
  }
}

ejecutarSQL()
