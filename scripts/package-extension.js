const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[GRUPOLEADS] Empacotando extensão para produção...');

const distDir = path.resolve(__dirname, '../extension/dist');
const zipOutput = path.resolve(__dirname, '../grupoleads-extension.zip');

if (!fs.existsSync(distDir)) {
  console.error('❌ Pasta extension/dist não encontrada. Execute npm run build --workspace=@grupoleads/extension primeiro.');
  process.exit(1);
}

try {
  if (fs.existsSync(zipOutput)) {
    fs.unlinkSync(zipOutput);
  }

  if (process.platform === 'win32') {
    execSync(`powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipOutput}' -Force"`);
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipOutput}" ./*`);
  }

  console.log(`✅ Extensão empacotada com sucesso em: ${zipOutput}`);
} catch (err) {
  console.error('Erro ao empacotar extensão:', err.message);
}
