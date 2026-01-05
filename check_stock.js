const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
  // 1. Ver productos del menú
  console.log('\n=== PRODUCTOS DEL MENÚ ===');
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, nombre, usar_stock_avanzado, crear_en_stock')
    .limit(10);
  
  console.log(JSON.stringify(menuItems, null, 2));

  // 2. Ver recetas
  console.log('\n=== RECETAS ===');
  const { data: recetas } = await supabase
    .from('menu_receta')
    .select('*, menu_items(nombre), stock_items(nombre, cantidad)')
    .limit(10);
  
  console.log(JSON.stringify(recetas, null, 2));

  // 3. Ver stock items
  console.log('\n=== STOCK ITEMS ===');
  const { data: stockItems } = await supabase
    .from('stock_items')
    .select('id, nombre, cantidad, tipo, utilizable_en_receta')
    .limit(10);
  
  console.log(JSON.stringify(stockItems, null, 2));

  // 4. Ver últimos pedidos
  console.log('\n=== ÚLTIMOS PEDIDOS PAGADOS ===');
  const { data: orders } = await supabase
    .from('orders')
    .select('id, estado, created_at, order_items(menu_item_id, cantidad, nombre_item_snapshot)')
    .eq('estado', 'PAGADO')
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log(JSON.stringify(orders, null, 2));
}

checkStock().catch(console.error);
