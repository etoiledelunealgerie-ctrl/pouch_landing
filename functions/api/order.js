/*
  functions/api/order.js  
*/

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  const required = ['bundle_size', 'bundle_price', 'order_qty', 'full_name', 'phone_number', 'wilaya_code', 'commune', 'delivery_method', 'lead_event_id'];
  for (const key of required) {
    if (body[key] === undefined || body[key] === null || body[key] === '') {
      return json({ success: false, error: 'missing_field', field: key }, 400);
    }
  }

  // ---- 1) Parse Data, IPs, and User Agent ------------------
  // Securely grab the client's actual IP and browser details from Cloudflare
  const ipAddress = request.headers.get('CF-Connecting-IP') || '';
  const userAgent = request.headers.get('User-Agent') || '';
  
  // Split 'full_name' into first name and last name
  const nameParts = (body.full_name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Construct the product format (e.g., "باقة 20 قطعة x2")
  const productString = `باقة ${body.bundle_size} قطعة x${body.order_qty}`;

  // ---- 2) Insert into Supabase (myclicks) -------------------------------------
  const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/myclicks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      fname: firstName,
      lname: lastName, 
      phone: body.phone_number,
      wilaya: body.wilaya_name, 
      commune: body.commune,
      address: body.full_address, 
      total_amount: body.total_amount,
      fbp: body.fbp, 
      fbc: body.fbc,
      ip_address: ipAddress,
      user_agent: userAgent,
      page: 'Pouch Bags Landing', // Identifies exactly where the lead came from
      products: productString,
      total_quantity: body.order_qty,
      status: 'pending'
    })
  });

  let supabaseDebug = null;
  if (!insertRes.ok) {
    const errText = await insertRes.text();
    supabaseDebug = { status: insertRes.status, error: errText };
    return json({ success: false, supabaseDebug }, 502);
  }
  const rows = await insertRes.json();
  const row = rows[0];

  // ---- 3) Fire server-side Lead event via Meta CAPI ----------------------------
  if (env.META_PIXEL_ID && env.META_ACCESS_TOKEN) {
    try {
      await fetch(`https://graph.facebook.com/v19.0/${env.META_PIXEL_ID}/events?access_token=${env.META_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            event_id: body.lead_event_id, 
            action_source: 'website',
            user_data: {
              ph: [await sha256(normalizePhone(body.phone_number))],
              client_ip_address: ipAddress,
              client_user_agent: userAgent,
              fbp: body.fbp,
              fbc: body.fbc
            },
            custom_data: { 
                currency: 'DZD', 
                value: body.total_amount,
                content_name: productString,
                num_items: body.order_qty
            }
          }]
        })
      });
    } catch (e) {
      // Fail silently for Meta to ensure the user still gets a success message
    }
  }

  return json({ success: true, order_id: row ? row.id : null });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function normalizePhone(p) {
  let clean = p.replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '213' + clean.substring(1);
  }
  return clean;
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}