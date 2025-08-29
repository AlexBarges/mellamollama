// site/api/send-email.js — usa la API HTTP de SendGrid (sin dependencias)
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok:false, error:'Method not allowed' });
  }

  try {
    const { to, subject, html, data, message } = await readJsonBody(req);

    // 1) localizar la plantilla (root = site/)
    let tplPath = null;
    const candidates = [
      'emails/email_generado7.html',
      'email/email_generado7.html',
      // fallbacks si algún día cambias el root del proyecto
      'site/emails/email_generado7.html',
      'site/email/email_generado7.html'
    ].map(p => path.join(process.cwd(), p));
    for (const p of candidates) { if (fs.existsSync(p)) { tplPath = p; break; } }
    if (!tplPath) throw new Error('No se encontró email_generado7.html');

    let emailHtml = html || fs.readFileSync(tplPath, 'utf8');

    // 2) reemplazo de {{llaves}} si existen en la plantilla
    if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        emailHtml = emailHtml.replaceAll(`{{${k}}}`, String(v ?? ''));
      }
    }

    // 3) bloque-resumen (por si la plantilla no tiene llaves)
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

    // 4) mensaje adicional al final (opcional)
    if (typeof message === 'string' && message.trim()) {
      const esc = s => String(s||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
      const caja = `
        <div style="margin:12px;padding:12px;border:1px dashed #e5e7eb;border-radius:8px;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">
          ${esc(message)}
        </div>`;
      emailHtml = emailHtml.replace(/<\/body\s*>/i, caja + '$&');
    }

    // 5) envío por API HTTP de SendGrid (no requiere @sendgrid/mail)
    const payload = {
      personalizations: [{
        to: [{ email: to || process.env.SENDGRID_TO || 'alexbargesrj@gmail.com' }]
      }],
      from: { email: process.env.SENDGRID_FROM },  // remitente verificado en SendGrid
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

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ ok:false, error: txt || r.statusText });
    }

    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || 'send failed' });
  }
};

