import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Iniciando seed do GRUPOLEADS...');

  const defaultUser = await prisma.user.upsert({
    where: { email: 'admin@grupoleads.com' },
    update: {},
    create: {
      name: 'Administrador GRUPOLEADS',
      email: 'admin@grupoleads.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      settings: {
        create: {
          ignoreFirstN: 100,
          ignoreAdmins: true,
          ignoreDuplicates: true,
          ignoreAlreadyRegistered: true,
          ignoreAlreadyInDestination: true,
          ignoreWithoutIdentifier: true,
          defaultBatchSize: 50,
          demoModeActive: false
        }
      }
    }
  });

  const defaultTags = [
    { name: 'Lead', color: '#3b82f6' },
    { name: 'Novo', color: '#10b981' },
    { name: 'Interessado', color: '#8b5cf6' },
    { name: 'Cliente', color: '#059669' },
    { name: 'VIP', color: '#f59e0b' },
    { name: 'Promoção', color: '#ec4899' }
  ];

  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: {
        userId_name: {
          userId: defaultUser.id,
          name: tag.name
        }
      },
      update: { color: tag.color },
      create: {
        userId: defaultUser.id,
        name: tag.name,
        color: tag.color
      }
    });
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
