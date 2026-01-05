const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Key:', supabaseKey ? 'Set' : 'Not set');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
  // 1. Ver productos del menú
  console.log('\n=== PRODUCTOS DEL MENÚ ===');
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, nombre, usar_stock_avanzado, crear_en_stock')
    .limit(10);
  
  if (menuError) console.log('Error:', menuError);
  else console.log(JSON.stringify(menuItems, null, 2));

  // 2. Ver recetas
  console.log('\n=== RECETAS ===');
  const { data: recetas, error: recetasError } = await supabase
    .from('menu_receta')
    .select('*, menu_items(nombre), stock_items(nombre, cantidad)')
    .limit(10);
  
  if (recetasError) console.log('Error:', recetasError);
  else console.log(JSON.stringify(recetas, null, 2));

  // 3. Ver stock items
  console.log('\n=== STOCK ITEMS ===');
  const { data: stockItems, error: stockError } = await supabase
    .from('stock_items')
    .select('id, nombre, cantidad, tipo, utilizable_en_receta')
    .limit(15);
  
  if (stockError) console.log('Error:', stockError);
  else console.log(JSON.stringify(stockItems, null, 2));
}

checkStock().catch(console.error);
