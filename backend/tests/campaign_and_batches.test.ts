import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/prisma';
import { CampaignService } from '../src/services/campaign.service';
import { BatchService } from '../src/services/batch.service';

describe('FASE 10 & FASE 11: Gerenciador de Campanhas, Lotes e Proteção contra Duplicidade', () => {
  let testUserId: string;
  const createdContactIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Campanhas',
        email: `test_camp_${Date.now()}@grupoleads.com`,
        passwordHash: 'hashed123'
      }
    });
    testUserId = user.id;

    // Cria 125 contatos para testar divisão exata em lotes de 50
    for (let i = 1; i <= 125; i++) {
      const c = await prisma.contact.create({
        data: {
          userId: testUserId,
          name: `Contato Campanha ${i}`,
          phone: `551198000${String(i).padStart(4, '0')}`,
          identifier: `id_${i}`,
          status: 'NOVO'
        }
      });
      createdContactIds.push(c.id);
    }
  });

  afterAll(async () => {
    await prisma.campaignContact.deleteMany({ where: { campaign: { userId: testUserId } } });
    await prisma.batchContact.deleteMany({ where: { batch: { campaign: { userId: testUserId } } } });
    await prisma.batch.deleteMany({ where: { campaign: { userId: testUserId } } });
    await prisma.campaign.deleteMany({ where: { userId: testUserId } });
    await prisma.contact.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('deve criar uma campanha e particionar 125 contatos em 3 lotes (50, 50, 25)', async () => {
    const campaign = await CampaignService.createCampaign(testUserId, {
      name: 'Campanha Teste Ofertas VIP',
      targetQuantity: 125,
      batchSize: 50,
      contactIds: createdContactIds
    });

    expect(campaign).toBeDefined();
    expect(campaign?.batches).toHaveLength(3);

    const batch1 = campaign?.batches?.find(b => b.batchNumber === 1);
    const batch2 = campaign?.batches?.find(b => b.batchNumber === 2);
    const batch3 = campaign?.batches?.find(b => b.batchNumber === 3);

    expect(batch1?.contacts).toHaveLength(50);
    expect(batch2?.contacts).toHaveLength(50);
    expect(batch3?.contacts).toHaveLength(25);
  });

  it('nunca deve colocar o mesmo contato em dois lotes da mesma campanha (Proteção contra duplicidade)', async () => {
    const campaign = await prisma.campaign.findFirst({
      where: { userId: testUserId, name: 'Campanha Teste Ofertas VIP' },
      include: {
        batches: {
          include: {
            contacts: true
          }
        }
      }
    });

    const contactIdOccurrences = new Map<string, number>();

    campaign?.batches.forEach(batch => {
      batch.contacts.forEach(bc => {
        const count = contactIdOccurrences.get(bc.contactId) || 0;
        contactIdOccurrences.set(bc.contactId, count + 1);
      });
    });

    // Cada contato deve aparecer EXATAMENTE 1 vez em toda a campanha
    for (const [contactId, count] of contactIdOccurrences.entries()) {
      expect(count).toBe(1);
    }
    expect(contactIdOccurrences.size).toBe(125);
  });

  it('deve registrar status de ação manual (ADICIONADO, NAO_ADICIONADO, ERRO) e atualizar métricas do lote e da campanha', async () => {
    const campaign = await prisma.campaign.findFirst({
      where: { userId: testUserId, name: 'Campanha Teste Ofertas VIP' },
      include: {
        batches: {
          orderBy: { batchNumber: 'asc' },
          include: { contacts: true }
        }
      }
    });

    const batch1 = campaign?.batches[0]!;
    const contactToProcess = batch1.contacts[0];

    // Atualiza status para ADICIONADO
    await BatchService.updateBatchContactStatus(
      testUserId,
      contactToProcess.id,
      'ADICIONADO',
      'Adicionado manualmente com sucesso via WhatsApp Web'
    );

    // Consulta estatísticas do lote
    const updatedBatch = await BatchService.getBatchById(testUserId, batch1.id);
    expect(updatedBatch?.stats.added).toBe(1);
    expect(updatedBatch?.stats.processed).toBe(1);
    expect(updatedBatch?.stats.pending).toBe(49);

    // Consulta estatísticas gerais da campanha
    const campStats = await CampaignService.getCampaignStats(campaign!.id);
    expect(campStats.added).toBe(1);
    expect(campStats.processed).toBe(1);
    expect(campStats.selected).toBe(125);
    expect(campStats.progressPercentage).toBe(1);
  });
});
