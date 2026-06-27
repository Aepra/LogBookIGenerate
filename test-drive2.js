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
  console.log("Starting Drive test...");
  
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

  let url = `${DRIVE_API_BASE}/files?fields=files(id,name,parents,ownedByMe,shared)&pageSize=100`;
  
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  let data = await res.json();
  
  console.log("ALL FILES Service Account can see:", JSON.stringify(data.files, null, 2));
}

run().catch(console.error);
