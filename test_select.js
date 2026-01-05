const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSelect() {
  const orderId = '9d75a7fb-1234-5678-9abc-def012345678'; // El pedido con empanada
  
  // Intentar el select como está en el código
  console.log('=== TEST SELECT CON RELACIÓN ===');
  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select('*, menu_items(id, nombre, usar_stock_avanzado, crear_en_stock)')
    .limit(5);
  
  if (error) {
    console.log('ERROR:', error);
  } else {
    console.log('Resultado:', JSON.stringify(orderItems, null, 2));
  }
}

testSelect().catch(console.error);
