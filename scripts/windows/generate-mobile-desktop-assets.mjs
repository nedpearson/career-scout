import os from "os";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";

function isPrivateIpv4(ip) {
  if (!ip) return false;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m) {
    const n = Number(m[1]);
    return n >= 16 && n <= 31;
  }
  return false;
}

function pickLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (!net) continue;
      if (net.family !== "IPv4") continue;
      if (net.internal) continue;
      const ip = net.address;
      if (!ip || ip.startsWith("169.254.")) continue; // APIPA
      candidates.push({ name, ip });
    }
  }

  // Prefer private IPv4 ranges typical for Wi‑Fi/LAN.
  const privateOnes = candidates.filter((c) => isPrivateIpv4(c.ip));
  if (privateOnes.length) return privateOnes[0].ip;
  if (candidates.length) return candidates[0].ip;
  return "localhost";
}

const port = Number(process.env.PORT || 5000);
const ip = pickLanIp();
const url = `http://${ip}:${port}/`;

const desktop = path.join(os.homedir(), "Desktop");
const qrPath = path.join(desktop, "Career Scout Mobile App QR.png");
const urlShortcutPath = path.join(desktop, "Career Scout Mobile App.url");
const htmlPath = path.join(desktop, "Career Scout Mobile Install.html");

await QRCode.toFile(qrPath, url, {
  width: 220,
  margin: 1,
  color: {
    dark: "#0f172a",
    light: "#ffffff",
  },
});

fs.writeFileSync(
  urlShortcutPath,
  [
    "[InternetShortcut]",
    `URL=${url}`,
    "IconIndex=0",
    "",
  ].join("\r\n"),
  "utf8",
);

fs.writeFileSync(
  htmlPath,
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Career Scout Mobile Install</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 18px; background: #f8fafc; }
      .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; max-width: 520px; }
      .row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
      img { width: 180px; height: 180px; image-rendering: crisp-edges; border: 1px solid #e2e8f0; border-radius: 8px; }
      a { color: #4f46e5; text-decoration: none; }
      a:hover { text-decoration: underline; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; }
      .muted { color: #475569; }
      ol { margin: 8px 0 0 20px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2 style="margin:0 0 8px 0;">Install Career Scout on Mobile</h2>
      <div class="row">
        <img src="${path.basename(qrPath)}" alt="Career Scout Mobile QR" />
        <div>
          <div class="muted" style="margin-bottom:10px;">Scan this QR code from your phone (same Wi‑Fi as this PC).</div>
          <div style="margin-bottom:10px;"><a href="${url}">${url}</a></div>
          <div class="muted">Then install:</div>
          <ol class="muted">
            <li>Open the link in Safari/Chrome</li>
            <li>Tap <b>Share</b> (iOS) or <b>⋮</b> (Android)</li>
            <li>Select <b>Add to Home Screen</b></li>
          </ol>
          <div class="muted" style="margin-top:10px;">If it won’t load, allow Windows Firewall for port <code>${port}</code>.</div>
        </div>
      </div>
    </div>
  </body>
</html>`,
  "utf8",
);

console.log("Created Desktop assets:");
console.log(" -", qrPath);
console.log(" -", urlShortcutPath);
console.log(" -", htmlPath);
console.log("URL:", url);

