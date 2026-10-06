const https = require('https');

const API_KEY = 'rnd_PjxPUXNTdlfDbzh336PMrDD9XE39';
const SERVICE_ID = 'srv-db2ohft9fdbs738m9ro0';
const DEPLOY_ID = 'dep-db2ohgd9fdbs738m9tgg';

function renderRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      port: 443,
      path: `/v1${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const deploy = await renderRequest(`/services/${SERVICE_ID}/deploys/${DEPLOY_ID}`);
  console.log('Status do Deploy no Render:', deploy.status);
  console.log('Criado em:', deploy.createdAt);
  console.log('Finalizado em:', deploy.finishedAt || 'em andamento...');
}

main().catch(console.error);
