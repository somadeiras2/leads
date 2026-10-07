import './env';
import { PrismaClient } from '@prisma/client';
import { config } from './env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const dbUrl = process.env.DATABASE_URL || config.databaseUrl;

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl
      }
    }
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
