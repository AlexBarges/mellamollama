// api/send-email.js (raíz)
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const to = process.env.SENDGRID_TO || 'alexbargesrj@gmail.com';
      const from = process.env.SENDGRID_FROM;
      const payload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject: 'Prueba GET send-email',
        content: [{ type: 'text/html', value: `<div>OK ${new Date().toISOString()}</div>` }]
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

  try {
    const chunks=[]; for await (const c of req) chunks.push(c);
    let body={}; try{ body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }catch{}
    const to = body.to || process.env.SENDGRID_TO || 'alexbargesrj@gmail.com';
    const subject = body.subject || 'Nueva reserva';
    const html = body.html || `<div>Reserva recibida ${new Date().toISOString()}</div>`;

    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM },
      subject, content: [{ type: 'text/html', value: html }]
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
  } catch(e) {
    return res.status(500).json({ ok:false, error: e?.message || 'send failed' });
  }
};
