const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ID del pedido con empanada que está ENTREGADO
const orderId = '9d75a7fb-dfbe-4d4e-a73d-a1f563709f64';

async function procesarDescuentoStock() {
  console.log('🔄 Iniciando descuento de stock para pedido:', orderId);
  
  // Stock ANTES
  const { data: stockAntes } = await supabase
    .from('stock_items')
    .select('nombre, cantidad')
    .eq('nombre', 'Empanada de carne')
    .single();
  
  console.log('\n📊 STOCK ANTES:', stockAntes);

  // Obtener items del pedido
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*, menu_items(id, nombre, usar_stock_avanzado, crear_en_stock)')
    .eq('order_id', orderId);
  
  if (itemsError) {
    console.log('❌ Error:', itemsError);
    return;
  }

  console.log(`\n📦 Items encontrados: ${orderItems.length}`);

  for (const item of orderItems) {
    const menuItem = item.menu_items;
    
    if (!menuItem) {
      console.log(`⚠️ ${item.nombre_item_snapshot} sin menu_item`);
      continue;
    }

    console.log(`\n📍 ${item.cantidad}x ${menuItem.nombre}`);
    console.log(`   usar_stock_avanzado: ${menuItem.usar_stock_avanzado}`);

    if (menuItem.usar_stock_avanzado) {
      const { data: recetas } = await supabase
        .from('menu_receta')
        .select('cantidad_usada, stock_items(id, nombre, cantidad, stock_minimo_alerta)')
        .eq('menu_item_id', menuItem.id);

      console.log(`   Recetas: ${recetas?.length || 0}`);

      for (const receta of recetas || []) {
        const stockItem = receta.stock_items;
        if (!stockItem) continue;

        const cantidadADescontar = receta.cantidad_usada * item.cantidad;
        const nuevaCantidad = stockItem.cantidad - cantidadADescontar;

        console.log(`   → ${stockItem.nombre}: ${stockItem.cantidad} - ${cantidadADescontar} = ${nuevaCantidad}`);

        // APLICAR DESCUENTO REAL
        const { error: updateError } = await supabase
          .from('stock_items')
          .update({ 
            cantidad: nuevaCantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', stockItem.id);

        if (updateError) {
          console.log(`   ❌ Error: ${updateError.message}`);
        } else {
          console.log(`   ✅ Stock actualizado!`);
          
          // Registrar movimiento
          await supabase
            .from('stock_movimientos')
            .insert({
              stock_item_id: stockItem.id,
              tipo: 'egreso',
              cantidad: cantidadADescontar,
              motivo: `TEST - Pedido cobrado (${menuItem.nombre})`,
              order_id: orderId
            });
        }
      }
    }
  }

  // Stock DESPUÉS
  const { data: stockDespues } = await supabase
    .from('stock_items')
    .select('nombre, cantidad')
    .eq('nombre', 'Empanada de carne')
    .single();
  
  console.log('\n📊 STOCK DESPUÉS:', stockDespues);
  console.log('\n✅ PROCESO COMPLETADO');
}

procesarDescuentoStock().catch(console.error);
