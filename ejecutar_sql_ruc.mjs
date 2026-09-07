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
  console.log('🔧 Intentando agregar columna ruc a customers...')
  
  const testRestaurantId = '11421b35-f19b-41ca-b9d8-b9cfaa94b80d'
  
  const { data, error } = await supabase
    .from('customers')
    .insert([{
      restaurant_id: testRestaurantId,
      nombre: 'TEST_RUC',
      ruc: '12345678-9',
      telefono: '0981-123456'
    }])
    .select()
  
  if (error) {
    if (error.message.includes('column "ruc" of relation "customers" does not exist')) {
      console.log('❌ La columna ruc NO EXISTE')
      console.log('📝 Ejecuta este SQL en Supabase:')
      console.log("ALTER TABLE customers ADD COLUMN IF NOT EXISTS ruc TEXT;")
      console.log("CREATE INDEX IF NOT EXISTS idx_customers_ruc ON customers(ruc);")
      return false
    } else {
      console.log('Error:', error.message)
      return false
    }
  } else {
    console.log('✅ La columna ruc YA EXISTE')
    // Eliminar el registro de prueba
    await supabase.from('customers').delete().eq('nombre', 'TEST_RUC')
    return true
  }
}

ejecutarSQL()
