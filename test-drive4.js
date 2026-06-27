const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

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

  // 1. Rename the user's shared folder to remove the space
  const sharedFolderId = '1KP33chyXHeLsOnUDt2gd3n4yHLCltSm3';
  let res = await fetch(`${DRIVE_API_BASE}/files/${sharedFolderId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'RiwayaFoto' })
  });
  console.log("Renamed shared folder:", res.status);

  // 2. Delete the Service Account's own 'RiwayaFoto' folder
  const saFolder1 = '1il3LP3w2Hm9dhZfKcTy8zrOBY-taOCEx';
  res = await fetch(`${DRIVE_API_BASE}/files/${saFolder1}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Deleted SA's RiwayaFoto folder:", res.status);

  // 3. Delete the Service Account's old 'riwaya' folder
  const saFolder2 = '1wxkEnSW8_Nb-mJjtjSXfGaS7X0dmdFmv';
  res = await fetch(`${DRIVE_API_BASE}/files/${saFolder2}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Deleted SA's riwaya folder:", res.status);
}

run().catch(console.error);
