const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const orderId = '9d75a7fb-dfbe-4d4e-a73d-a1f563709f64';

async function testDescuento() {
  console.log('=== SIMULANDO DESCUENTO DE STOCK ===\n');
  console.log('Order ID:', orderId);
  
  // 1. Obtener items del pedido
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*, menu_items(id, nombre, usar_stock_avanzado, crear_en_stock)')
    .eq('order_id', orderId);
  
  if (itemsError) {
    console.log('ERROR:', itemsError);
    return;
  }

  console.log('\nItems del pedido:', orderItems?.length);

  for (const item of orderItems || []) {
    const menuItem = item.menu_items;
    
    if (!menuItem) {
      console.log(`\n❌ ${item.nombre_item_snapshot} - sin menu_item`);
      continue;
    }

    console.log(`\n📦 ${item.cantidad}x ${menuItem.nombre}`);
    console.log(`   usar_stock_avanzado: ${menuItem.usar_stock_avanzado}`);
    console.log(`   crear_en_stock: ${menuItem.crear_en_stock}`);

    if (menuItem.usar_stock_avanzado) {
      const { data: recetas } = await supabase
        .from('menu_receta')
        .select('cantidad_usada, stock_items(id, nombre, cantidad)')
        .eq('menu_item_id', menuItem.id);
      
      console.log(`   Recetas: ${recetas?.length || 0}`);

      for (const receta of recetas || []) {
        const si = receta.stock_items;
        if (!si) continue;
        
        const descontar = receta.cantidad_usada * item.cantidad;
        console.log(`   → ${si.nombre}: ${si.cantidad} - ${descontar} = ${si.cantidad - descontar}`);
      }
    }
  }
}

testDescuento().catch(console.error);
