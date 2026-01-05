const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkOrders() {
  // Ver últimos pedidos con sus items
  console.log('\n=== ÚLTIMOS PEDIDOS PAGADOS CON ITEMS ===');
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, 
      estado, 
      created_at,
      order_items(
        id,
        menu_item_id, 
        cantidad, 
        nombre_item_snapshot
      )
    `)
    .eq('estado', 'PAGADO')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  for (const order of orders) {
    console.log(`\nPedido: ${order.id.slice(0,8)} - ${order.created_at}`);
    for (const item of order.order_items || []) {
      console.log(`  - ${item.cantidad}x ${item.nombre_item_snapshot} (menu_item_id: ${item.menu_item_id || 'NULL'})`);
    }
  }

  // Ver movimientos de stock
  console.log('\n=== MOVIMIENTOS DE STOCK RECIENTES ===');
  const { data: movimientos, error: movError } = await supabase
    .from('stock_movimientos')
    .select('*, stock_items(nombre)')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (movError) console.log('Error movimientos:', movError);
  else {
    for (const mov of movimientos || []) {
      console.log(`${mov.tipo}: ${mov.cantidad} de ${mov.stock_items?.nombre} - ${mov.motivo}`);
    }
  }
}

checkOrders().catch(console.error);
