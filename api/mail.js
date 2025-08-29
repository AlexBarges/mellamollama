// api/mail.js — prueba simple por GET (en RAÍZ del repo)
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(200).send('Usa GET en /api/mail');
  }

  try {
    const to = process.env.SENDGRID_TO || 'alexbargesrj@gmail.com';
    const from = process.env.SENDGRID_FROM; // debe estar verificado en SendGrid
    const payload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject: 'Probe /api/mail',
      content: [{ type: 'text/html', value: `<div style="font-family:Arial">Probe OK<br/>${new Date().toISOString()}</div>` }]
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
};
