const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findOrder() {
  // Buscar pedidos que empiezan con 9d75a7fb
  const { data } = await supabase
    .from('orders')
    .select('id, estado, order_items(nombre_item_snapshot, cantidad)')
    .ilike('id', '9d75a7fb%');
  
  console.log('Pedidos encontrados:');
  console.log(JSON.stringify(data, null, 2));
  
  // También buscar cualquier pedido ENTREGADO con empanada
  console.log('\n\nPedidos ENTREGADOS con empanada:');
  const { data: orders } = await supabase
    .from('orders')
    .select('id, estado, order_items!inner(nombre_item_snapshot, cantidad, menu_item_id)')
    .eq('estado', 'ENTREGADO');
  
  for (const o of orders || []) {
    const hasEmpanada = o.order_items.some(i => i.nombre_item_snapshot.toLowerCase().includes('empanada'));
    if (hasEmpanada) {
      console.log(`ID: ${o.id}`);
      console.log('Items:', o.order_items);
    }
  }
}

findOrder().catch(console.error);
