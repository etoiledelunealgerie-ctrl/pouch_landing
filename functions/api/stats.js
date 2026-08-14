export async function onRequestGet(context) {
  const { env } = context;

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/myclicks?select=id`, {
      method: 'GET',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Range-Unit': 'items',
        'Range': '0-0', // We only want the metadata, not the actual rows
        'Prefer': 'count=exact'
      }
    });

    // Supabase returns the count in the Content-Range header (e.g., "0-0/42")
    const range = res.headers.get('content-range');
    const count = range ? parseInt(range.split('/')[1], 10) : 0;

    return new Response(JSON.stringify({ count: count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ count: 0 }), { status: 500 });
  }
}