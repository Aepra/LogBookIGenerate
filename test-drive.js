const { GoogleAuth } = require('google-auth-library');
require('dotenv').config({ path: 'd:\\GITHUB\\Project\\logbook-generate\\.env' });

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

async function run() {
  console.log("Starting Drive test...");
  
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const token = tokenRes.token;

  if (!token) {
    console.error("No token!");
    return;
  }

  console.log("Token obtained.");

  // 1. Search for all folders named 'RiwayaFoto'
  let q = `name='RiwayaFoto' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  let url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents,ownedByMe,shared)`;
  
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  let data = await res.json();
  
  console.log("Found folders named 'RiwayaFoto':", JSON.stringify(data.files, null, 2));

  // 2. See if there are files in sharedWithMe
  q = `name='RiwayaFoto' and mimeType='application/vnd.google-apps.folder' and trashed=false and sharedWithMe=true`;
  url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents,ownedByMe,shared)`;
  
  res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  data = await res.json();
  
  console.log("Found folders named 'RiwayaFoto' (sharedWithMe):", JSON.stringify(data.files, null, 2));
}

run().catch(console.error);
