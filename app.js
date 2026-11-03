const form = document.querySelector('#chatForm');
const input = document.querySelector('#chatInput');
const messages = document.querySelector('#chatMessages');
const mode = document.querySelector('#aiMode');
const themeToggle = document.querySelector('#themeToggle');
let history = [];

function setTheme(theme) {
  const light = theme === 'light';
  if (light) document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  themeToggle.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
  themeToggle.title = `Switch to ${light ? 'dark' : 'light'} theme`;
  themeToggle.querySelector('.theme-label').textContent = light ? 'DARK' : 'LIGHT';
  themeToggle.querySelector('.theme-icon').textContent = light ? '◐' : '☼';
  try { localStorage.setItem('jatin-portfolio-theme', light ? 'light' : 'dark'); } catch {}
}

themeToggle.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});
setTheme(document.documentElement.dataset.theme || 'dark');

function localDemoReply(question) {
  const q = question.toLowerCase();
  if (/aware|primafelicitas|carbon|climatiq|trace|sustainab/.test(q)) return 'At Primafelicitas, I contribute to AWARE, a fashion and textile supply chain traceability platform. My work includes Angular impact dashboards and reports, Climatiq CO2e calculations, Node/Express APIs, MongoDB impact data, Notion synchronization, KYB flows, and AWS releases.';
  if (/which|what.*project|earlier|eil|vendor|tgt|gas station/.test(q)) return 'Earlier projects include the Vendor Document Management System at Engineers India Limited, where I worked on Spring Boot APIs and responsive UI, and a Gas Station Network Management System at TGT with SCADA-style monitoring, GIS, and alarms.';
  if (/ai|copilot|llm/.test(q)) return 'This portfolio includes an AI copilot feature that answers questions using my resume details as context. My resume does not list previous professional AI or LLM project experience.';
  if (/skill|stack|technolog/.test(q)) return 'I work with Angular, TypeScript, Node.js, Express, REST APIs, MongoDB, Mongoose, MySQL, Redis, and AWS. My resume also lists React, Java Spring Boot, C#/.NET Core, GIS, Web3/RPC, and Polygon.';
  if (/education|degree|college|cgpa/.test(q)) return 'I completed a B.Tech in Computer Science and Engineering at B.M. Institute of Engineering and Technology, Sonipat, in 2025, with an 8.2 CGPA.';
  if (/contact|email|phone|hire|opportunit/.test(q)) return 'I have not published my email address or phone number here. You can connect with me through my GitHub profile: github.com/jatinsharmabharatdwaj.';
  return 'I can help with a quick tour of my AWARE work, earlier projects, technical skills, education, or contact details. What would you like to know?';
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));

function addMessage(text, who) {
  const row = document.createElement('div');
  row.className = `message ${who === 'user' ? 'user-message' : 'assistant-message'}`;
  if (who !== 'user') {
    const avatar = document.createElement('span');
    avatar.className = 'message-avatar';
    avatar.textContent = 'a.';
    row.append(avatar);
  }
  const bubble = document.createElement('p');
  bubble.textContent = text;
  row.append(bubble);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return row;
}

async function ask(question) {
  if (!question.trim()) return;
  addMessage(question, 'user');
  history.push({ role: 'user', content: question });
  const pending = addMessage('Thinking…', 'assistant');
  const bubble = pending.querySelector('p');
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-8) })
    });
    if (!response.ok) throw new Error('The assistant is unavailable right now. Try again shortly.');
    const data = await response.json();
    bubble.textContent = data.reply;
    mode.textContent = data.mode === 'live' ? 'AI-POWERED' : 'DEMO MODE';
    history.push({ role: 'assistant', content: data.reply });
  } catch (error) {
    // A page opened directly as a local file cannot call its relative API URL.
    // Keep the portfolio copilot usable in that preview with resume-grounded replies.
    bubble.textContent = localDemoReply(question);
    mode.textContent = 'DEMO MODE';
    history.push({ role: 'assistant', content: bubble.textContent });
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) return;
  input.value = '';
  ask(question);
});

document.querySelectorAll('.quick-prompts button').forEach((button) => {
  button.addEventListener('click', () => ask(button.dataset.prompt));
});

fetch('/api/status').then((response) => response.json()).then((data) => {
  mode.textContent = data.live ? 'AI-POWERED' : 'DEMO MODE';
}).catch(() => {});
