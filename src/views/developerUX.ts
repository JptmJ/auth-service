import { env } from "../config/env";

export const homePage = () => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Auth Service</title>

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
  font-family:Inter,Segoe UI,sans-serif;
}

body{
  min-height:100vh;
  background:
    radial-gradient(circle at top left,#3b82f6,#111827),
    radial-gradient(circle at bottom right,#8b5cf6,#111827);
  color:white;
  overflow-x:hidden;
}

.container{
  max-width:1200px;
  margin:auto;
  padding:40px 20px;
}

.hero{
  text-align:center;
  margin-top:80px;
}

.badge{
  display:inline-block;
  padding:8px 16px;
  border-radius:999px;
  background:rgba(255,255,255,.1);
  backdrop-filter:blur(10px);
  margin-bottom:20px;
}

.hero h1{
  font-size:4rem;
  margin-bottom:16px;
}

.hero p{
  color:#d1d5db;
  font-size:1.2rem;
}

.cards{
  margin-top:60px;
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
  gap:24px;
}

.card{
  background:rgba(255,255,255,.08);
  backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,.1);
  border-radius:20px;
  padding:24px;
  transition:.3s;
}

.card:hover{
  transform:translateY(-8px);
}

.card h3{
  margin-bottom:10px;
}

.card p{
  color:#d1d5db;
}

.card a{
  display:inline-block;
  margin-top:16px;
  color:#60a5fa;
  text-decoration:none;
  font-weight:600;
}

.endpoints{
  margin-top:60px;
}

.endpoint{
  background:#111827;
  border-radius:12px;
  padding:16px;
  margin-top:12px;
}

.method{
  font-weight:bold;
  padding:4px 10px;
  border-radius:6px;
  margin-right:12px;
}

.post{
  background:#22c55e;
}

.get{
  background:#3b82f6;
}

footer{
  margin-top:80px;
  text-align:center;
  color:#9ca3af;
}
</style>
</head>

<body>

<div class="container">

<div class="hero">
  <div class="badge">🚀 Authentication Microservice</div>

  <h1>Auth Service</h1>

  <p>
    Secure JWT Authentication, Refresh Tokens,
    Session Management & User Identity APIs
  </p>
</div>

<div class="cards">

  <div class="card">
    <h3>📘 Swagger Docs</h3>
    <p>Interactive API testing and documentation.</p>
    <a href="/docs">Open Docs →</a>
  </div>

  <div class="card">
    <h3>❤️ Health Check</h3>
    <p>Verify service availability.</p>
    <a href="/health">Check Status →</a>
  </div>

  <div class="card">
    <h3>🔐 Auth APIs</h3>
    <p>User authentication endpoints.</p>
    <a href="#endpoints">View Endpoints →</a>
  </div>

</div>

<div class="endpoints" id="endpoints">

<h2>Available Endpoints</h2>

<div class="endpoint">
<span class="method post">POST</span>
/api/auth/register
</div>

<div class="endpoint">
<span class="method post">POST</span>
/api/auth/login
</div>

<div class="endpoint">
<span class="method post">POST</span>
/api/auth/refresh
</div>

<div class="endpoint">
<span class="method post">POST</span>
/api/auth/logout
</div>

<div class="endpoint">
<span class="method get">GET</span>
/api/auth/me
</div>

</div>

<footer>
Version 1.0.0 • Auth Service
</footer>

</div>

</body>
</html>
`;


export const healthPage = (uptime: number) => `

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Auth Service Health</title>

<style>

*{
  margin:0;
  padding:0;
  box-sizing:border-box;
  font-family:Inter,Segoe UI,sans-serif;
}

body{
  min-height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  background:#0f172a;
  color:white;
  overflow:hidden;
}

body::before{
  content:'';
  position:absolute;
  width:500px;
  height:500px;
  background:#2563eb;
  border-radius:50%;
  filter:blur(180px);
  opacity:.25;
  top:-150px;
  left:-150px;
}

body::after{
  content:'';
  position:absolute;
  width:500px;
  height:500px;
  background:#7c3aed;
  border-radius:50%;
  filter:blur(180px);
  opacity:.25;
  bottom:-150px;
  right:-150px;
}

.card{
  position:relative;
  z-index:10;
  width:700px;
  max-width:90%;
  background:rgba(255,255,255,.05);
  backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,.1);
  border-radius:24px;
  padding:40px;
  text-align:center;
}

.status-circle{
  width:120px;
  height:120px;
  margin:auto;
  border-radius:50%;
  background:#22c55e;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:3rem;
  margin-bottom:25px;
  box-shadow:0 0 40px rgba(34,197,94,.6);
}

h1{
  font-size:3rem;
  margin-bottom:10px;
}

.subtitle{
  color:#94a3b8;
  margin-bottom:40px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:20px;
}

.stat{
  background:rgba(255,255,255,.05);
  border-radius:16px;
  padding:20px;
}

.label{
  color:#94a3b8;
  margin-bottom:8px;
}

.value{
  font-size:1.2rem;
  font-weight:600;
}

.footer{
  margin-top:30px;
}

.footer a{
  text-decoration:none;
  color:#60a5fa;
  margin:0 10px;
}

</style>
</head>

<body>

<div class="card">

<div class="status-circle">
✓
</div>

<h1>Service Healthy</h1>

<p class="subtitle">
All systems operational
</p>

<div class="grid">

<div class="stat">
<div class="label">Service</div>
<div class="value">auth-service</div>
</div>

<div class="stat">
<div class="label">Status</div>
<div class="value">ONLINE</div>
</div>

<div class="stat">
<div class="label">Environment</div>
<div class="value">${env.nodeEnv}</div>
</div>

<div class="stat">
<div class="label">Port</div>
<div class="value">${env.port}</div>
</div>

<div class="stat">
<div class="label">Uptime</div>
<div class="value">${uptime}s</div>
</div>

<div class="stat">
<div class="label">Timestamp</div>
<div class="value">${new Date().toLocaleTimeString()}</div>
</div>

</div>

<div class="footer">
<a href="/">Dashboard</a>
<a href="/docs">Swagger Docs</a>
</div>

</div>

</body>
</html>
`;
