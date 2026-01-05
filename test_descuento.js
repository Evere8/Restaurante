const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Simular el pedido con empanada
const orderId = '9d75a7fb-0ddb-4dbb-a413-8e91e29ff395'; // pedido con empanada listo para cobrar

async function testDescuento() {
  console.log('=== SIMULANDO DESCUENTO DE STOCK ===\n');
  
  // 1. Obtener items del pedido con información del menu_item
  console.log('1. Obteniendo items del pedido...');
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*, menu_items(id, nombre, usar_stock_avanzado, crear_en_stock)')
    .eq('order_id', orderId);
  
  if (itemsError) {
    console.log('ERROR obteniendo items:', itemsError);
    return;
  }

  console.log('Items encontrados:', orderItems?.length || 0);
  console.log(JSON.stringify(orderItems, null, 2));

  if (!orderItems || orderItems.length === 0) {
    console.log('No hay items');
    return;
  }

  // 2. Procesar cada item
  for (const item of orderItems) {
    const menuItem = item.menu_items;
    
    if (!menuItem) {
      console.log(`\n❌ Item ${item.nombre_item_snapshot} no tiene menu_item asociado`);
      continue;
    }

    console.log(`\n📦 Procesando: ${item.cantidad}x ${menuItem.nombre}`);
    console.log(`   usar_stock_avanzado: ${menuItem.usar_stock_avanzado}`);
    console.log(`   crear_en_stock: ${menuItem.crear_en_stock}`);

    // Caso 1: Producto usa stock avanzado (tiene receta)
    if (menuItem.usar_stock_avanzado) {
      console.log('   → Tiene receta, buscando insumos...');
      
      const { data: recetas, error: recetaError } = await supabase
        .from('menu_receta')
        .select('*, stock_items(id, nombre, cantidad, stock_minimo_alerta)')
        .eq('menu_item_id', menuItem.id);
      
      if (recetaError) {
        console.log('   ERROR receta:', recetaError);
        continue;
      }

      console.log(`   Recetas encontradas: ${recetas?.length || 0}`);

      for (const receta of recetas || []) {
        const stockItem = receta.stock_items;
        if (!stockItem) continue;

        const cantidadADescontar = receta.cantidad_usada * item.cantidad;
        const nuevaCantidad = stockItem.cantidad - cantidadADescontar;

        console.log(`   🔹 ${stockItem.nombre}: ${stockItem.cantidad} - ${cantidadADescontar} = ${nuevaCantidad}`);
        
        // DESCOMENTAR PARA APLICAR EL DESCUENTO REAL:
        // const { error: updateError } = await supabase
        //   .from('stock_items')
        //   .update({ cantidad: nuevaCantidad })
        //   .eq('id', stockItem.id);
        // console.log('   Update:', updateError ? updateError : 'OK');
      }
    }
  }
}

testDescuento().catch(console.error);
