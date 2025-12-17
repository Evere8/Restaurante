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

async function addColumn() {
  console.log('🔧 Agregando columna unidad_medida a stock_items...')
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS unidad_medida TEXT DEFAULT 'unidad';"
  })
  
  if (error) {
    console.log('⚠️  No se pudo agregar por RPC, intentando método alternativo...')
    console.log('Error:', error.message)
    console.log('\n📝 Por favor ejecuta este SQL manualmente en Supabase SQL Editor:')
    console.log("ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS unidad_medida TEXT DEFAULT 'unidad';")
  } else {
    console.log('✅ Columna agregada exitosamente')
  }
}

addColumn()
