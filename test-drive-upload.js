const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('d:\\GITHUB\\Project\\logbook-generate\\.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const parts = line.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

async function run() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const token = tokenRes.token;

  // Create dummy image buffer
  const fileBuffer = Buffer.from("dummy image content 123", "utf-8");
  const mimeType = "image/jpeg";
  const safeName = "test-image.jpg";
  const parentId = "1LaloBIckBQnqOPc48wlT_CEatU2WZwP-"; // The folder we created earlier

  const boundary = "drive_upload_boundary_" + Date.now();
  const metadata = JSON.stringify({ name: safeName, parents: [parentId] });
  
  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
  const mediaHeadBytes = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const mediaFootBytes = `\r\n--${boundary}--`;

  const totalLen = Buffer.byteLength(metaPart) + Buffer.byteLength(mediaHeadBytes) + fileBuffer.byteLength + Buffer.byteLength(mediaFootBytes);
  const body = Buffer.concat([
    Buffer.from(metaPart, 'utf-8'),
    Buffer.from(mediaHeadBytes, 'utf-8'),
    fileBuffer,
    Buffer.from(mediaFootBytes, 'utf-8')
  ]);

  console.log("Uploading with total length:", totalLen);

  const res = await fetch(`${UPLOAD_BASE}/files?uploadType=multipart&fields=id,webViewLink,name,mimeType,parents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": totalLen.toString()
    },
    body: body
  });

  if (!res.ok) {
    console.error("Upload failed:", res.status);
    console.error(await res.text());
  } else {
    const data = await res.json();
    console.log("Upload success:", data);
  }
}

run().catch(console.error);
