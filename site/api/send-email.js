// site/api/send-email.js — SendGrid vía HTTP (sin dependencias) + TEST por GET
const fs = require('fs');
const path = require('path');

async function readJsonBody(req) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    let body = '';
    for await (const chunk of req) body += chunk;
    try { return JSON.parse(body || '{}'); } catch { return {}; }
  }
  return {};
}

module.exports = async (req, res) => {
// === TEST RÁPIDO: visitar /api/send-email (GET) envía un correo de prueba ===
if (req.method === 'GET') {
    try {
      const to = process.env.SENDGRID_TO || 'alexbargesrj@gmail.com';
      const from = process.env.SENDGRID_FROM;
      const html = `<div style="font-family:Arial">Prueba OK desde GET.<br/>Hora: ${new Date().toISOString()}</div>`;
      const payload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject: 'Prueba (GET) — CITAS7',
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
    const { to, subject, html, data, message } = await readJsonBody(req);

    // localizar plantilla (root=site/)
    let tplPath = null;
    const candidates = [
      'emails/email_generado7.html',
      'email/email_generado7.html',
      'site/emails/email_generado7.html',
      'site/email/email_generado7.html'
    ].map(p => path.join(process.cwd(), p));
    for (const p of candidates) { if (fs.existsSync(p)) { tplPath = p; break; } }
    if (!tplPath) throw new Error('No se encontró email_generado7.html');

    let emailHtml = html || fs.readFileSync(tplPath, 'utf8');

    // reemplazo de {{llaves}}
    if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        emailHtml = emailHtml.replaceAll(`{{${k}}}`, String(v ?? ''));
      }
    }

    // bloque resumen
    if (data && typeof data === 'object') {
      const esc = s => String(s||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
      const resumen = `
        <div style="margin:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">
          <div style="font-weight:700;margin-bottom:6px">Registro de clase</div>
          ${data.name  ? `<div><strong>Alumno:</strong> ${esc(data.name)}</div>`   : ''}
          ${data.level ? `<div><strong>Nivel:</strong> ${esc(data.level)}</div>`   : ''}
          ${data.email ? `<div><strong>Correo:</strong> ${esc(data.email)}</div>` : ''}
          ${data.fecha ? `<div><strong>Fecha:</strong> ${esc(data.fecha)}</div>` : ''}
          ${data.hora  ? `<div><strong>Horario:</strong> ${esc(data.hora)}</div>` : ''}
          ${data.dateISO ? `<div><strong>ISO:</strong> ${esc(data.dateISO)}</div>` : ''}
        </div>`;
      emailHtml = emailHtml.replace(/<body[^>]*>/i, m => m + resumen);
    }

    if (typeof message === 'string' && message.trim()) {
      const esc = s => String(s||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
      const caja = `
        <div style="margin:12px;padding:12px;border:1px dashed #e5e7eb;border-radius:8px;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">
          ${esc(message)}
        </div>`;
      emailHtml = emailHtml.replace(/<\/body\s*>/i, caja + '$&');
    }

    // envío
    const payload = {
      personalizations: [{ to: [{ email: to || process.env.SENDGRID_TO || 'alexbargesrj@gmail.com' }] }],
      from: { email: process.env.SENDGRID_FROM },
      subject: subject || 'Nueva reserva',
      content: [{ type: 'text/html', value: emailHtml }]
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
