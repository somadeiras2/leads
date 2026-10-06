import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { config } from './config/env';

export const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'GRUPOLEADS',
    slogan: 'Organize seus contatos. Gerencie seus leads.',
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
app.use('/api', routes);

// Middleware global de erro
app.use(errorHandler);
