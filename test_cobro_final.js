const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const orderId = '9d75a7fb-dfbe-4d4e-a73d-a1f563709f64';

async function test() {
  // Stock ANTES
  const { data: antes } = await supabase
    .from('stock_items')
    .select('nombre, cantidad')
    .eq('nombre', 'Empanada de carne')
    .single();
  
  console.log('📊 STOCK ANTES:', antes);

  // Obtener items
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*, menu_items(id, nombre, usar_stock_avanzado)')
    .eq('order_id', orderId);

  for (const item of orderItems) {
    const menuItem = item.menu_items;
    if (!menuItem || !menuItem.usar_stock_avanzado) continue;

    const { data: recetas } = await supabase
      .from('menu_receta')
      .select('cantidad_usada, stock_items(id, nombre, cantidad)')
      .eq('menu_item_id', menuItem.id);

    for (const receta of recetas || []) {
      const si = receta.stock_items;
      if (!si) continue;

      const descontar = receta.cantidad_usada * item.cantidad;
      const nuevo = si.cantidad - descontar;

      console.log(`\n🔹 Descontando ${descontar} de ${si.nombre}`);
      console.log(`   ${si.cantidad} - ${descontar} = ${nuevo}`);

      // UPDATE SIN updated_at
      const { error } = await supabase
        .from('stock_items')
        .update({ cantidad: nuevo })
        .eq('id', si.id);

      if (error) {
        console.log('   ❌ ERROR:', error.message);
      } else {
        console.log('   ✅ OK!');
        
        // Registrar movimiento
        await supabase.from('stock_movimientos').insert({
          stock_item_id: si.id,
          tipo: 'egreso',
          cantidad: descontar,
          motivo: `Venta cobrada - ${menuItem.nombre}`,
          order_id: orderId
        });
      }
    }
  }

  // Stock DESPUÉS
  const { data: despues } = await supabase
    .from('stock_items')
    .select('nombre, cantidad')
    .eq('nombre', 'Empanada de carne')
    .single();
  
  console.log('\n📊 STOCK DESPUÉS:', despues);

  // Ver movimientos
  const { data: movimientos } = await supabase
    .from('stock_movimientos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log('\n📜 ÚLTIMOS MOVIMIENTOS:');
  for (const m of movimientos || []) {
    console.log(`   - ${m.tipo}: ${m.cantidad} - ${m.motivo}`);
  }
}

test().catch(console.error);
