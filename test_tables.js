const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testTables() {
  // Verificar si la tabla stock_movimientos existe
  console.log('=== VERIFICANDO TABLAS ===\n');
  
  const { data: mov, error: movError } = await supabase
    .from('stock_movimientos')
    .select('*')
    .limit(1);
  
  if (movError) {
    console.log('❌ Tabla stock_movimientos:', movError.message);
  } else {
    console.log('✅ Tabla stock_movimientos existe');
  }

  // Verificar menu_receta
  const { data: receta, error: recetaError } = await supabase
    .from('menu_receta')
    .select('*')
    .limit(1);
  
  if (recetaError) {
    console.log('❌ Tabla menu_receta:', recetaError.message);
  } else {
    console.log('✅ Tabla menu_receta existe');
  }

  // Verificar stock_items
  const { data: stock, error: stockError } = await supabase
    .from('stock_items')
    .select('*')
    .limit(1);
  
  if (stockError) {
    console.log('❌ Tabla stock_items:', stockError.message);
  } else {
    console.log('✅ Tabla stock_items existe');
  }

  // Probar insertar en stock_movimientos
  console.log('\n=== PROBANDO INSERT EN stock_movimientos ===');
  const { error: insertError } = await supabase
    .from('stock_movimientos')
    .insert({
      stock_item_id: '524f385e-6fec-4c53-a336-089ed1b6681e', // Empanada de carne
      tipo: 'egreso',
      cantidad: 0.001,
      motivo: 'TEST - Eliminar este registro'
    });
  
  if (insertError) {
    console.log('❌ Error insertando:', insertError);
  } else {
    console.log('✅ Insert OK');
    
    // Limpiar
    await supabase
      .from('stock_movimientos')
      .delete()
      .eq('motivo', 'TEST - Eliminar este registro');
    console.log('🧹 Registro de prueba eliminado');
  }
}

testTables().catch(console.error);
