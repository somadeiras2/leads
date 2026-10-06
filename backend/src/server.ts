import { app } from './app';
import { config } from './config/env';

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`GRUPOLEADS Backend REST API iniciado com sucesso!`);
  console.log(`Porta: http://localhost:${config.port}`);
  console.log(`Ambiente: ${config.nodeEnv}`);
  console.log(`Healthcheck: http://localhost:${config.port}/health`);
  console.log(`====================================================`);
});

process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM, encerrando servidor HTTP gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
