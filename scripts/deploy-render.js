const https = require('https');

const API_KEY = 'rnd_PjxPUXNTdlfDbzh336PMrDD9XE39';
const OWNER_ID = 'tea-db2oe78m7kps73bmq5a0';

function renderRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'api.render.com',
      port: 443,
      path: `/v1${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function main() {
  console.log('Criando Web Service "grupoleads-api" no Render...');

  const servicePayload = {
    type: 'web_service',
    name: 'grupoleads-api',
    ownerId: OWNER_ID,
    repo: 'https://github.com/somadeiras2/leads',
    branch: 'main',
    autoDeploy: 'yes',
    serviceDetails: {
      env: 'node',
      plan: 'free',
      region: 'oregon',
      envSpecificDetails: {
        buildCommand: 'npm install && npm run build --workspace=@grupoleads/shared && npm run build --workspace=@grupoleads/backend',
        startCommand: 'npm run start --workspace=@grupoleads/backend'
      },
      envVars: [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'CORS_ORIGIN', value: '*' },
        { key: 'JWT_SECRET', value: 'grupoleads_super_secret_jwt_key_2026_production_ready' },
        { key: 'DATABASE_URL', value: 'postgresql://postgres.nwrvzruulblclpxwkbzh:Grupoleads2026%40@aws-1-ca-central-1.pooler.supabase.com:5432/postgres' },
        { key: 'DIRECT_URL', value: 'postgresql://postgres.nwrvzruulblclpxwkbzh:Grupoleads2026%40@aws-1-ca-central-1.pooler.supabase.com:5432/postgres' }
      ]
    }
  };

  const createRes = await renderRequest('/services', 'POST', servicePayload);
  console.log('Resultado da criação:', JSON.stringify(createRes, null, 2));
}

main().catch(console.error);
