import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();

const defaultDbUrl = 'postgresql://postgres.nwrvzruulblclpxwkbzh:Grupoleads2026%40@aws-1-ca-central-1.pooler.supabase.com:5432/postgres';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = defaultDbUrl;
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = defaultDbUrl;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  databaseUrl: process.env.DATABASE_URL || defaultDbUrl,
  jwtSecret: process.env.JWT_SECRET || 'grupoleads_super_secret_jwt_key_2026_production_ready',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
