module.exports = async (req, res) => {
  if(req.method !== 'POST'){ res.statusCode=405; return res.end('Use POST'); }
  const { SENDGRID_API_KEY, FROM_EMAIL, TO_EMAIL } = process.env;
  if(!SENDGRID_API_KEY || !FROM_EMAIL || !TO_EMAIL){
    res.statusCode=500; return res.end('Faltan variables de entorno');
  }
  let body=''; for await (const chunk of req) body += chunk;
  const data = JSON.parse(body || '{}');
  const message = data.message || '';
  const subject = data.subject || 'Nuevo mensaje';
  const payload = {
    personalizations:[{ to:[{ email: TO_EMAIL }] }],
    from:{ email: FROM_EMAIL },
    subject,
    content:[{ type:'text/plain', value: message }]
  };
  try{
    const sg = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${SENDGRID_API_KEY}`, 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    if(!sg.ok){ const t=await sg.text(); res.statusCode=500; return res.end('Error SendGrid: '+t); }
    res.end('OK');
  }catch(e){ res.statusCode=500; res.end('Error: '+e.message); }
};