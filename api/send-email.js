// api/send-email.js
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function readJsonBody(req) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    return JSON.parse(body || '{}');
  }
  return {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, data } = await readJsonBody(req);

    // Si no envías `html` en el body, usa la plantilla del repo:
    let emailHtml = html;
    if (!emailHtml) {
      const tplPath = path.join(process.cwd(), 'site', 'emails', 'email_generado7.html');
      emailHtml = fs.readFileSync(tplPath, 'utf8');
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          emailHtml = emailHtml.replaceAll(`{{${k}}}`, String(v));
        }
      }
    }

    const msg = {
      to: to || process.env.SENDGRID_TO,
      from: process.env.SENDGRID_FROM,     // remitente verificado en SendGrid
      subject: subject || 'Nueva consulta',
      html: emailHtml
    };

    const [out] = await sgMail.send(msg);
    return res.status(200).json({ ok: true, id: out?.headers?.['x-message-id'] || 'sent' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'send failed' });
  }
};
