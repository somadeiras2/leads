import { prisma } from '../config/prisma';

export class DemoService {
  /**
   * Limpa dados anteriores do usuário e gera o Modo Demo completo:
   * 500 contatos, 5 grupos, 3 campanhas, 10 lotes e tags
   */
  static async seedDemoData(userId: string) {
    // 1. Limpa dados anteriores relacionados do usuário para ambiente limpo
    await prisma.campaignContact.deleteMany({ where: { campaign: { userId } } });
    await prisma.batchContact.deleteMany({ where: { batch: { campaign: { userId } } } });
    await prisma.batch.deleteMany({ where: { campaign: { userId } } });
    await prisma.campaign.deleteMany({ where: { userId } });
    await prisma.collectionItem.deleteMany({ where: { collection: { userId } } });
    await prisma.collection.deleteMany({ where: { userId } });
    await prisma.groupContact.deleteMany({ where: { group: { userId } } });
    await prisma.contactTag.deleteMany({ where: { contact: { userId } } });
    await prisma.contact.deleteMany({ where: { userId } });
    await prisma.group.deleteMany({ where: { userId } });
    await prisma.tag.deleteMany({ where: { userId } });

    // 2. Cria Tags padrão
    const tagDefs = [
      { name: 'Lead', color: '#3b82f6' },
      { name: 'Novo', color: '#10b981' },
      { name: 'Interessado', color: '#8b5cf6' },
      { name: 'Cliente', color: '#059669' },
      { name: 'VIP', color: '#f59e0b' },
      { name: 'Promoção', color: '#ec4899' }
    ];

    const tags = await Promise.all(
      tagDefs.map(t => prisma.tag.create({ data: { userId, name: t.name, color: t.color } }))
    );

    // 3. Cria 5 Grupos
    const groupNames = [
      'Ofertas VIP Imóveis',
      'Networking Empreendedores Brasil',
      'Compradores Qualificados SP',
      'Mentoria B2B & Vendas',
      'Lançamento Digital Alpha'
    ];

    const groups = await Promise.all(
      groupNames.map((name, idx) =>
        prisma.group.create({
          data: {
            userId,
            name,
            waGroupId: `wa_group_${1000 + idx}@g.us`,
            description: `Grupo profissional de prospecção ${name}`,
            lastCollectedAt: new Date(Date.now() - idx * 3600000 * 24)
          }
        })
      )
    );

    // 4. Cria 500 Contatos fictícios com nomes e telefones brasileiros
    const firstNames = [
      'João', 'Maria', 'Lucas', 'Ana', 'Pedro', 'Juliana', 'Carlos', 'Fernanda',
      'Rodrigo', 'Beatriz', 'Felipe', 'Camila', 'Gabriel', 'Larissa', 'Bruno', 'Mariana',
      'Rafael', 'Amanda', 'Gustavo', 'Carla', 'Diego', 'Patrícia', 'Thiago', 'Letícia',
      'Marcelo', 'Renata', 'André', 'Vanessa', 'Leonardo', 'Bruna', 'Mateus', 'Priscila',
      'Vitor', 'Aline', 'Danilo', 'Jéssica', 'Eduardo', 'Tatiane', 'Alexandre', 'Natália'
    ];

    const lastNames = [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
      'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
      'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
      'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos'
    ];

    const ddds = ['11', '19', '21', '31', '41', '47', '51', '61', '71', '81'];
    const statuses = ['NOVO', 'INTERESSADO', 'CLIENTE', 'VIP', 'PENDENTE', 'ADICIONADO'];

    const contactsData = [];
    for (let i = 0; i < 500; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[(i * 7) % lastNames.length];
      const ddd = ddds[i % ddds.length];
      const num = 900000000 + (i * 12345) % 99999999;
      const phone = `55${ddd}${num}`;
      const status = statuses[i % statuses.length];
      const groupIdx = i % groups.length;

      contactsData.push({
        userId,
        name: `${fn} ${ln}`,
        phone,
        identifier: phone,
        status,
        notes: i % 5 === 0 ? `Lead qualificado de ${groups[groupIdx].name}` : null,
        sourceGroup: groups[groupIdx].name,
        sourceGroupId: groups[groupIdx].id,
        lastCollectedAt: new Date(Date.now() - (i % 30) * 86400000)
      });
    }

    const createdContacts = [];
    for (const data of contactsData) {
      const contact = await prisma.contact.create({ data });
      createdContacts.push(contact);

      // Relaciona ao grupo de origem
      await prisma.groupContact.create({
        data: {
          groupId: data.sourceGroupId!,
          contactId: contact.id
        }
      });

      // Em 25% dos contatos, relaciona a um segundo grupo para simular multi-grupo
      if (createdContacts.length % 4 === 0) {
        const secondGroup = groups[(groups.findIndex(g => g.id === data.sourceGroupId!) + 1) % groups.length];
        await prisma.groupContact.upsert({
          where: { groupId_contactId: { groupId: secondGroup.id, contactId: contact.id } },
          create: { groupId: secondGroup.id, contactId: contact.id },
          update: {}
        });
      }

      // Atribui tags
      const tagIndex = createdContacts.length % tags.length;
      await prisma.contactTag.create({
        data: {
          contactId: contact.id,
          tagId: tags[tagIndex].id
        }
      });
    }

    // 5. Cria 3 Campanhas e 10 Lotes no total
    // Campanha 1: Ofertas VIP (300 contatos em 6 lotes de 50)
    const camp1Contacts = createdContacts.slice(0, 300);
    const camp1 = await prisma.campaign.create({
      data: {
        userId,
        name: 'Ofertas VIP — Prospecção Ativa',
        targetGoal: 300,
        batchSize: 50,
        status: 'EM_ANDAMENTO',
        sourceGroupId: groups[0].id,
        destinationGroupId: groups[2].id
      }
    });

    for (let b = 0; b < 6; b++) {
      const batchContactsSlice = camp1Contacts.slice(b * 50, (b + 1) * 50);
      const isFirst = b === 0;
      const isSecond = b === 1;

      const batch = await prisma.batch.create({
        data: {
          campaignId: camp1.id,
          batchNumber: b + 1,
          targetSize: 50,
          status: isFirst ? 'CONCLUIDO' : isSecond ? 'EM_ANDAMENTO' : 'PENDENTE'
        }
      });

      const batchContactsData = batchContactsSlice.map((c, idx) => {
        let status = 'PENDENTE';
        if (isFirst) {
          status = idx < 42 ? 'ADICIONADO' : idx < 47 ? 'NAO_ADICIONADO' : 'JA_NO_GRUPO';
        } else if (isSecond) {
          status = idx < 15 ? 'ADICIONADO' : idx < 20 ? 'NAO_ADICIONADO' : 'PENDENTE';
        }
        return {
          batchId: batch.id,
          contactId: c.id,
          status,
          processedAt: status !== 'PENDENTE' ? new Date() : null
        };
      });

      await prisma.batchContact.createMany({ data: batchContactsData });
    }

    // Campanha 2: Mentoria B2B (100 contatos em 2 lotes de 50)
    const camp2Contacts = createdContacts.slice(300, 400);
    const camp2 = await prisma.campaign.create({
      data: {
        userId,
        name: 'Convite Mentoria Empresarial',
        targetGoal: 100,
        batchSize: 50,
        status: 'EM_ANDAMENTO',
        sourceGroupId: groups[3].id,
        destinationGroupId: groups[4].id
      }
    });

    for (let b = 0; b < 2; b++) {
      const batch = await prisma.batch.create({
        data: {
          campaignId: camp2.id,
          batchNumber: b + 1,
          targetSize: 50,
          status: b === 0 ? 'CONCLUIDO' : 'PENDENTE'
        }
      });

      const slice = camp2Contacts.slice(b * 50, (b + 1) * 50);
      await prisma.batchContact.createMany({
        data: slice.map((c, idx) => ({
          batchId: batch.id,
          contactId: c.id,
          status: b === 0 ? (idx < 40 ? 'ADICIONADO' : 'NAO_ADICIONADO') : 'PENDENTE',
          processedAt: b === 0 ? new Date() : null
        }))
      });
    }

    // Campanha 3: Lançamento Alpha (100 contatos em 2 lotes de 50)
    const camp3Contacts = createdContacts.slice(400, 500);
    const camp3 = await prisma.campaign.create({
      data: {
        userId,
        name: 'Early Birds Lançamento Alpha',
        targetGoal: 100,
        batchSize: 50,
        status: 'PAUSADA',
        sourceGroupId: groups[4].id
      }
    });

    for (let b = 0; b < 2; b++) {
      const batch = await prisma.batch.create({
        data: {
          campaignId: camp3.id,
          batchNumber: b + 1,
          targetSize: 50,
          status: 'PENDENTE'
        }
      });

      const slice = camp3Contacts.slice(b * 50, (b + 1) * 50);
      await prisma.batchContact.createMany({
        data: slice.map(c => ({
          batchId: batch.id,
          contactId: c.id,
          status: 'PENDENTE'
        }))
      });
    }

    // 6. Registra coletas simuladas no histórico
    for (let i = 0; i < groups.length; i++) {
      await prisma.collection.create({
        data: {
          userId,
          groupId: groups[i].id,
          groupName: groups[i].name,
          totalFound: 180 + i * 45,
          newCount: 85 + i * 15,
          duplicatesCount: 20 + i * 5,
          ignoredCount: 75 + i * 25,
          createdAt: new Date(Date.now() - i * 86400000 * 2)
        }
      });
    }

    // 7. Atualiza settings do usuário
    await prisma.settings.upsert({
      where: { userId },
      create: {
        userId,
        demoModeActive: true,
        defaultBatchSize: 50
      },
      update: {
        demoModeActive: true
      }
    });

    return {
      success: true,
      contactsCreated: createdContacts.length,
      groupsCreated: groups.length,
      campaignsCreated: 3,
      batchesCreated: 10
    };
  }
}
