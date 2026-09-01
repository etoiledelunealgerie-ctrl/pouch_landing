export async function onRequestGet(context) {
  const { env } = context;

  try {
    // Call a custom database function (RPC) to calculate the sum
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/get_total_pieces`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch aggregate sum');
    }

    // Supabase RPC returns the raw number (or null if the table is empty)
    const totalPieces = await res.json();

    return new Response(JSON.stringify({ count: totalPieces || 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ count: 0 }), { status: 500 });
  }
}