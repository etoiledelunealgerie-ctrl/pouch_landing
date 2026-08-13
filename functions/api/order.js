/*
  functions/api/order.js  →  https://YOUR-DOMAIN/api/order
  Cloudflare Pages routes by EXACT file path (see PDF §1). The frontend
  calls fetch('/api/order') — this file MUST stay at functions/api/order.js,
  not renamed, or you get a silent 404 with zero logs.

  TODO(env vars): set these in Cloudflare Pages → Settings → Environment
  variables. NEVER hardcode them in this file (this file goes to GitHub).
    SUPABASE_URL            e.g. https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY    service_role key (server-side only, never expose to client)
    META_PIXEL_ID           TODO
    META_ACCESS_TOKEN       TODO (System User token from Events Manager)

  TODO(table): this expects a `orders` table matching supabase-schema.sql.
  Run that file in the Supabase SQL editor before testing.
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

  // ---- 1) Insert into Supabase ------------------------------------------------
  // ---- 1) Parse Data & Extract Cookies for 'myclicks' schema ------------------
  const cookieHeader = request.headers.get('Cookie') || '';
  const fbpMatch = cookieHeader.match(/_fbp=([^;]+)/);
  const fbcMatch = cookieHeader.match(/_fbc=([^;]+)/);
  
  // Split 'full_name' into first name and last name
  const nameParts = (body.full_name || '').trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

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
      fbp: fbpMatch ? fbpMatch[1] : null,
      fbc: fbcMatch ? fbcMatch[1] : null,
      status: 'pending'
    })
  });
  
  // Per PDF §4: never trust a 200 by itself — read the real body.
  let supabaseDebug = null;
  if (!insertRes.ok) {
    const errText = await insertRes.text();
    supabaseDebug = { status: insertRes.status, error: errText };
    // TODO: remove supabaseDebug from the returned JSON before going live —
    // it exposes internal error details to anyone calling this endpoint directly.
    return json({ success: false, supabaseDebug }, 502);
  }
  const rows = await insertRes.json();
  const row = rows[0];

  // ---- 2) Fire server-side Lead event via Meta CAPI ----------------------------
  // Uses the SAME event_id the browser Pixel already fired client-side (fbq Lead),
  // so Meta dedupes them into one Lead instead of counting twice.
  if (env.META_PIXEL_ID && env.META_ACCESS_TOKEN) {
    try {
      await fetch(`https://graph.facebook.com/v19.0/${env.META_PIXEL_ID}/events?access_token=${env.META_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            event_id: body.lead_event_id, // must match the client-side fbq call exactly
            action_source: 'website',
            user_data: {
              ph: [await sha256(normalizePhone(body.phone_number))],
              client_ip_address: request.headers.get('CF-Connecting-IP') || undefined,
              client_user_agent: request.headers.get('User-Agent') || undefined
              // TODO: add fbp/fbc cookies from the request if you forward them from the client —
              // curl can't produce real ones (PDF §8), only a real browser session can.
            },
            custom_data: { currency: 'DZD', value: body.bundle_price }
          }]
        })
      });
    } catch (e) {
      // Don't fail the order if CAPI has a hiccup — the order itself is already saved.
    }
  }

  return json({ success: true, order_id: row ? row.id : null });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

function normalizePhone(p) {
  let clean = p.replace(/\D/g, '');
  // If it's an Algerian local number starting with 0, replace 0 with 213
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