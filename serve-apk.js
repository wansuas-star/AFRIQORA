const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const APK_PATH = path.join(__dirname, 'afriqora-app-debug.apk');

const server = http.createServer((req, res) => {
  if (req.url === '/download' || req.url === '/afriqora.apk' || req.url === '/afriqora-app-debug.apk') {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('APK not found. Please build the APK first.');
    }
    const stat = fs.statSync(APK_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="afriqora.apk"',
      'Content-Length': stat.size,
    });
    const readStream = fs.createReadStream(APK_PATH);
    readStream.pipe(res);
    return;
  }

  // Beautiful mobile-friendly one-tap download landing page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download AFRIQORA Android App</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #070d18;
      color: #f8fafc;
      margin: 0;
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      text-align: center;
    }
    .card {
      background: rgba(15, 26, 44, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 20px;
      padding: 2.5rem 1.5rem;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .logo {
      width: 72px;
      height: 72px;
      border-radius: 16px;
      background: #ffffff;
      padding: 6px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
      color: #38bdf8;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin-bottom: 1.75rem;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
      color: #04111d;
      font-weight: 700;
      font-size: 1.1rem;
      padding: 1rem 2rem;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 20px rgba(56, 189, 248, 0.4);
      width: 80%;
      transition: transform 0.2s;
    }
    .btn:active {
      transform: scale(0.96);
    }
    .badge {
      display: inline-block;
      margin-top: 1.25rem;
      font-size: 0.75rem;
      color: #34d399;
      background: rgba(52, 211, 153, 0.15);
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <img class="logo" src="/assets/afriqora-logo.png" alt="AFRIQORA" onerror="this.style.display='none'">
    <h1>AFRIQORA</h1>
    <p>Official Android Mobile App<br>Version 1.0 (Direct Install)</p>
    <a href="/download" class="btn">⬇️ Download APK</a>
    <div>
      <span class="badge">✓ Verified Build (8.02 MB)</span>
    </div>
  </div>
</body>
</html>`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AFRIQORA APK server running at http://0.0.0.0:${PORT}`);
});
