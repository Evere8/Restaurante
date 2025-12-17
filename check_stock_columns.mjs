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

async function checkAndAddColumn() {
  console.log('📋 Verificando si existe columna unidad_medida...')
  
  // Intentar insertar un registro de prueba con unidad_medida
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .limit(1)
    .single()
  
  if (data) {
    console.log('Columnas actuales:', Object.keys(data))
    
    if (!Object.keys(data).includes('unidad_medida')) {
      console.log('\n❌ La columna unidad_medida NO EXISTE')
      console.log('\n🔧 Necesitas ejecutar este SQL en Supabase:')
      console.log('\nALTER TABLE stock_items ADD COLUMN IF NOT EXISTS unidad_medida TEXT DEFAULT \'unidad\';')
    } else {
      console.log('\n✅ La columna unidad_medida YA EXISTE')
    }
  }
}

checkAndAddColumn()
