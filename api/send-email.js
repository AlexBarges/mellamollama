// api/send-email.js (RAÍZ)
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // leer body JSON
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body = {};
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch {}

    // destinatario y remitente (acepta tus nombres TO_EMAIL / FROM_EMAIL)
    const to = body.to
      || process.env.SENDGRID_TO
      || process.env.TO_EMAIL
      || 'alexbargesrj@gmail.com'; // fallback final

    const from = process.env.SENDGRID_FROM
      || process.env.FROM_EMAIL;   // tu Single Sender verificado (alex_rj@live.com)

    // asunto y contenido
    const subject = body.subject || 'Mensaje';
    const html = body.html || `<div style="font-family:Arial;white-space:pre-wrap">${String(body.message || '')}</div>`;

    if (!from) {
      return res.status(400).json({ ok: false, error: 'Missing FROM (SENDGRID_FROM or FROM_EMAIL)' });
    }

    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
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
    if (!r.ok) return res.status(r.status).json({ ok: false, error: txt || r.statusText });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'send failed' });
  }
};
