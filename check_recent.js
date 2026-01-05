const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  // Pedidos de HOY
  console.log('\n=== PEDIDOS RECIENTES (últimas 24h) ===');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const { data: orders } = await supabase
    .from('orders')
    .select('id, estado, created_at, fecha_pago, order_items(nombre_item_snapshot, cantidad, menu_item_id)')
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });
  
  if (orders) {
    for (const o of orders) {
      console.log(`\n${o.id.slice(0,8)} | Estado: ${o.estado} | Creado: ${o.created_at} | Pagado: ${o.fecha_pago || 'N/A'}`);
      for (const i of o.order_items || []) {
        console.log(`  - ${i.cantidad}x ${i.nombre_item_snapshot}`);
      }
    }
  }

  // Pedidos ENTREGADOS listos para cobrar
  console.log('\n\n=== PEDIDOS ENTREGADOS (Listos para cobrar) ===');
  const { data: entregados } = await supabase
    .from('orders')
    .select('id, estado, created_at, order_items(nombre_item_snapshot, cantidad)')
    .eq('estado', 'ENTREGADO');
  
  if (entregados) {
    for (const o of entregados) {
      console.log(`\n${o.id.slice(0,8)} | ${o.created_at}`);
      for (const i of o.order_items || []) {
        console.log(`  - ${i.cantidad}x ${i.nombre_item_snapshot}`);
      }
    }
  }
  
  if (!entregados || entregados.length === 0) {
    console.log('No hay pedidos entregados para cobrar');
  }
}

check().catch(console.error);
