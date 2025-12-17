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

async function checkStructure() {
  console.log('📋 Verificando estructura de stock_items...\n')
  
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .limit(1)
  
  if (data && data.length > 0) {
    console.log('Columnas disponibles en stock_items:')
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}`)
    })
  } else if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('No hay datos en stock_items')
  }
}

checkStructure()
