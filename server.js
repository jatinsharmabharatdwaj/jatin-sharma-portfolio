const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const profile = `
Name: Jatin Sharma.
Role: Full Stack / MEAN Stack Developer at Primafelicitas, Noida (September 2025–Present).
Education: B.Tech Computer Science and Engineering, B.M. Institute of Engineering and Technology, Sonipat, 2025; 8.2 CGPA.
Skills: JavaScript, TypeScript, Angular, React.js, Node.js, Express.js, REST APIs, MongoDB, Mongoose, MySQL, Redis, AWS, Git, Postman, Java Spring Boot, C#/.NET Core, GIS, Web3/RPC, Polygon.
Integrations: Climatiq API, Notion API synchronization, AsiaVerify KYB.
Projects:
- AWARE (Primafelicitas): fashion and textile supply chain traceability platform. Jatin contributes Angular admin modules, impact reports, Climatiq CO2e calculations, Node/Express APIs, MongoDB impact and audit data, Notion synchronization, AsiaVerify KYB, purchase order flows, and AWS deployments.
- Vendor Document Management System (Engineers India Limited): Jan–Apr 2025. Java Spring Boot APIs and responsive web UI for vendor document submission and approval workflows.
- Gas Station Network Management System (TGT Fuel & Technology / Aavantika Gas): Jul–Sep 2024. SCADA-style gas flow and compressor monitoring, GIS station management, and alarms using C#/.NET Core, JavaScript, and MySQL.
AI feature: This portfolio includes an AI copilot grounded in the resume facts above. Do not claim prior professional AI/LLM project experience; the resume does not list any.
Certificates: EIL internship completion; SWAYAM/NPTEL Web Technology (IGNOU); TGT internship completion; research paper on MealConnect food waste management.
Contact: Jatin has chosen not to publish his email address or phone number. His public GitHub profile is github.com/jatinsharmabharatdwaj.
`;

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function demoReply(question) {
  const q = question.toLowerCase();
  if (/aware|primafelicitas|carbon|climatiq|trace|sustainab/.test(q)) return 'At Primafelicitas, Jatin contributes to AWARE, a fashion and textile supply chain traceability platform. His work includes Angular impact dashboards and reports, Climatiq CO2e calculations, Node/Express APIs, MongoDB impact and audit data, Notion synchronization, KYB flows, and AWS releases.';
  if (/which|what.*project|earlier|eil|vendor|tgt|gas station/.test(q)) return 'Earlier projects include the Vendor Document Management System at Engineers India Limited, where Jatin worked on Spring Boot APIs and responsive UI, and a Gas Station Network Management System at TGT with SCADA-style monitoring, GIS, and alarms.';
  if (/ai|copilot|llm/.test(q)) return 'The portfolio includes an AI copilot feature that answers questions using Jatin’s resume details as context. His resume does not list previous professional AI or LLM project experience.';
  if (/skill|stack|technolog/.test(q)) return 'Jatin works with Angular, TypeScript, Node.js, Express, REST APIs, MongoDB, Mongoose, MySQL, Redis, and AWS. His resume also lists React, Java Spring Boot, C#/.NET Core, GIS, Web3/RPC, and Polygon.';
  if (/education|degree|college|cgpa/.test(q)) return 'Jatin completed a B.Tech in Computer Science and Engineering at B.M. Institute of Engineering and Technology, Sonipat, in 2025, with an 8.2 CGPA.';
  if (/contact|email|phone|hire|opportunit/.test(q)) return 'Jatin has chosen not to publish his email address or phone number here. You can connect with him through github.com/jatinsharmabharatdwaj.';
  return 'I can help with a quick tour of Jatin’s AWARE work, earlier projects, technical skills, education, or contact details. What would you like to know?';
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/status') return send(res, 200, { live: Boolean(process.env.OPENAI_API_KEY) });
  if (req.method === 'POST' && req.url === '/api/chat') {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 20_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const latest = messages.filter((m) => m.role === 'user').at(-1)?.content;
        if (typeof latest !== 'string' || !latest.trim() || latest.length > 500) return send(res, 400, { error: 'Please send a message up to 500 characters.' });
        if (!process.env.OPENAI_API_KEY) return send(res, 200, { reply: demoReply(latest), mode: 'demo' });
        const safeMessages = messages.slice(-8).filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
        const result = await fetch(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.4, max_tokens: 220, messages: [
            { role: 'system', content: `You are Jatin Sharma's portfolio copilot. Answer warmly and concisely using only these profile facts. If asked for something not covered, say so and invite the visitor to contact Jatin. Do not claim Jatin has professional AI/LLM project experience: his AI copilot is a portfolio feature.\n\n${profile}` },
            ...safeMessages
          ] })
        });
        const resultBody = await result.json();
        if (!result.ok) return send(res, 502, { error: 'The AI provider could not answer right now.' });
        return send(res, 200, { reply: resultBody.choices?.[0]?.message?.content || 'I could not form an answer just now. Try again.', mode: 'live' });
      } catch {
        return send(res, 400, { error: 'I could not read that message. Please try again.' });
      }
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(res, 400, { error: 'Invalid path.' }); }
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root + path.sep)) return send(res, 403, { error: 'Forbidden.' });
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 404, { error: 'Not found.' });
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});
server.listen(port, () => console.log(`Portfolio running at http://localhost:${port}`));
