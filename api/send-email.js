// api/send-email.js — versión simple: prueba por GET y envío por POST.
// (En la RAÍZ del repo, no dentro de /site)

module.exports = async (req, res) => {
  // ▶ PRUEBA RÁPIDA: visita /api/send-email?test=1
  if (req.method === 'GET' && /\btest=1\b/.test(req.url || '')) {
    try {
      const to = process.env.SENDGRID_TO || 'alexbargesrj@gmail.com'; // fallback a tu correo
      const from = process.env.SENDGRID_FROM; // debe ser un remitente verificado en SendGrid
      const payload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject: 'Prueba (GET) — send-email raíz',
        content: [{ type: 'text/html', value: `<div style="font-family:Arial">Prueba OK<br/>${new Date().toISOString()}</div>` }]
      };

      const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const txt = await r.text();
      if (!r.ok) return res.status(r.status).send(txt || r.statusText);
      return res.status(200).send('OK');
    } catch (e) {
      return res.status(500).send(e?.message || 'send failed');
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }

  // ▶ Envío normal por POST (usa JSON: { to?, subject?, html? })
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body = {};
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch {}

    const to = body.to || process.env.SENDGRID_TO || 'alexbargesrj@gmail.com';
    const subject = body.subject || 'Nueva reserva';
    const html = body.html || `<div style="font-family:Arial">
      Reserva recibida<br/>
      ${new Date().toISOString()}
    </div>`;

    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM },
      subject,
      content: [{ type: 'text/html', value: html }]
    };

    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const txt = await r.text();
    if (!r.ok) return res.status(r.status).json({ ok:false, error: txt || r.statusText });
    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || 'send failed' });
  }
};
