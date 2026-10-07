import { prisma } from '../config/prisma';

export class BatchService {
  static async getBatchById(userId: string, batchId: string) {
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        campaign: { userId }
      },
      include: {
        campaign: {
          include: {
            sourceGroup: true,
            destinationGroup: true
          }
        },
        contacts: {
          include: {
            contact: {
              include: {
                groups: { include: { group: true } },
                tags: { include: { tag: true } }
              }
            }
          }
        }
      }
    });

    if (!batch) return null;

    // Calcular estatísticas específicas do lote
    const total = batch.contacts.length;
    let added = 0;
    let notAdded = 0;
    let pending = 0;
    let error = 0;
    let alreadyInGroup = 0;

    for (const c of batch.contacts) {
      if (c.status === 'ADICIONADO') added++;
      else if (c.status === 'NAO_ADICIONADO') notAdded++;
      else if (c.status === 'PENDENTE') pending++;
      else if (c.status === 'ERRO') error++;
      else if (c.status === 'JA_NO_GRUPO') alreadyInGroup++;
    }

    const processed = added + notAdded + error + alreadyInGroup;

    const campaignBatches = await prisma.batch.findMany({
      where: { campaignId: batch.campaignId },
      orderBy: { batchNumber: 'asc' },
      select: {
        id: true,
        batchNumber: true,
        targetSize: true,
        status: true,
        _count: { select: { contacts: true } }
      }
    });

    return {
      ...batch,
      campaign: {
        ...batch.campaign,
        batches: campaignBatches
      },
      stats: {
        total,
        processed,
        added,
        notAdded,
        pending,
        error,
        alreadyInGroup,
        isCompleted: pending === 0 && total > 0
      }
    };
  }

  /**
   * Atualiza o status de um contato dentro do lote (Adicionado, Não adicionado, Erro, Já estava no grupo)
   */
  static async updateBatchContactStatus(
    userId: string,
    batchContactId: string,
    status: string,
    notes?: string | null
  ) {
    const batchContact = await prisma.batchContact.findFirst({
      where: {
        id: batchContactId,
        batch: { campaign: { userId } }
      },
      include: { contact: true, batch: true }
    });

    if (!batchContact) {
      throw new Error('Item do lote não encontrado ou acesso não permitido.');
    }

    const updated = await prisma.batchContact.update({
      where: { id: batchContactId },
      data: {
        status,
        notes: notes !== undefined ? notes : batchContact.notes,
        processedAt: new Date()
      }
    });

    // Se o contato foi marcado como ADICIONADO, atualiza também o status no CRM se desejado
    if (status === 'ADICIONADO') {
      await prisma.contact.update({
        where: { id: batchContact.contactId },
        data: { status: 'ADICIONADO' }
      });
    } else if (status === 'NAO_ADICIONADO') {
      await prisma.contact.update({
        where: { id: batchContact.contactId },
        data: { status: 'NAO_ADICIONADO' }
      });
    }

    // Verifica se todos os contatos do lote foram processados
    const pendingRemaining = await prisma.batchContact.count({
      where: {
        batchId: batchContact.batchId,
        status: 'PENDENTE'
      }
    });

    if (pendingRemaining === 0) {
      await prisma.batch.update({
        where: { id: batchContact.batchId },
        data: { status: 'CONCLUIDO' }
      });
    }

    return updated;
  }

  /**
   * Marca múltiplos contatos de um lote como processados em massa
   */
  static async bulkUpdateBatchContacts(
    userId: string,
    batchId: string,
    items: Array<{ id: string; status: string; notes?: string }>
  ) {
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        campaign: { userId }
      }
    });

    if (!batch) {
      throw new Error('Lote não encontrado.');
    }

    const now = new Date();
    for (const item of items) {
      await prisma.batchContact.update({
        where: { id: item.id },
        data: {
          status: item.status,
          notes: item.notes,
          processedAt: now
        }
      });
    }

    // Reavalia status do lote
    const pendingCount = await prisma.batchContact.count({
      where: { batchId, status: 'PENDENTE' }
    });

    if (pendingCount === 0) {
      await prisma.batch.update({
        where: { id: batchId },
        data: { status: 'CONCLUIDO' }
      });
    }

    return this.getBatchById(userId, batchId);
  }

  /**
   * Remove individualmente um contato do lote
   */
  static async removeContactFromBatch(userId: string, batchContactId: string) {
    const batchContact = await prisma.batchContact.findFirst({
      where: {
        id: batchContactId,
        batch: { campaign: { userId } }
      }
    });

    if (!batchContact) {
      throw new Error('Item do lote não encontrado.');
    }

    await prisma.batchContact.delete({
      where: { id: batchContactId }
    });

    // Atualiza targetSize do lote
    await prisma.batch.update({
      where: { id: batchContact.batchId },
      data: {
        targetSize: { decrement: 1 }
      }
    });

    return { success: true };
  }

  /**
   * Obtém o próximo lote pendente de uma campanha
   */
  static async getNextPendingBatch(userId: string, campaignId: string, currentBatchNumber: number) {
    const nextBatch = await prisma.batch.findFirst({
      where: {
        campaignId,
        campaign: { userId },
        batchNumber: { gt: currentBatchNumber },
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] }
      },
      orderBy: { batchNumber: 'asc' }
    });

    return nextBatch;
  }

  /**
   * Obtém o lote ativo ou com contatos pendentes mais recente
   */
  static async getActiveBatch(userId: string) {
    const pendingBatch = await prisma.batch.findFirst({
      where: {
        campaign: { userId },
        contacts: {
          some: { status: 'PENDENTE' }
        }
      },
      orderBy: [
        { campaign: { createdAt: 'desc' } },
        { batchNumber: 'asc' }
      ],
      select: { id: true }
    });

    if (pendingBatch) {
      return this.getBatchById(userId, pendingBatch.id);
    }

    const recentBatch = await prisma.batch.findFirst({
      where: { campaign: { userId } },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });

    if (recentBatch) {
      return this.getBatchById(userId, recentBatch.id);
    }

    return null;
  }

  /**
   * Obtém todos os lotes combinados da campanha com lista completa de contatos
   */
  static async getAllBatchesCombined(userId: string, campaignId?: string) {
    let camp = null;
    if (campaignId) {
      camp = await prisma.campaign.findFirst({
        where: { id: campaignId, userId },
        include: { sourceGroup: true, destinationGroup: true }
      });
    } else {
      camp = await prisma.campaign.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { sourceGroup: true, destinationGroup: true }
      });
    }

    if (!camp) return null;

    const campaignBatches = await prisma.batch.findMany({
      where: { campaignId: camp.id },
      orderBy: { batchNumber: 'asc' },
      select: {
        id: true,
        batchNumber: true,
        targetSize: true,
        status: true,
        _count: { select: { contacts: true } }
      }
    });

    const batchContacts = await prisma.batchContact.findMany({
      where: { batch: { campaignId: camp.id } },
      orderBy: [
        { batch: { batchNumber: 'asc' } },
        { id: 'asc' }
      ],
      include: {
        contact: {
          include: {
            tags: { include: { tag: true } }
          }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      }
    });

    const total = batchContacts.length;
    let added = 0;
    let notAdded = 0;
    let pending = 0;
    let error = 0;
    let alreadyInGroup = 0;

    for (const c of batchContacts) {
      if (c.status === 'ADICIONADO') added++;
      else if (c.status === 'NAO_ADICIONADO') notAdded++;
      else if (c.status === 'PENDENTE') pending++;
      else if (c.status === 'ERRO') error++;
      else if (c.status === 'JA_NO_GRUPO') alreadyInGroup++;
    }

    const processed = added + notAdded + error + alreadyInGroup;

    return {
      id: 'all',
      batchNumber: 0,
      isAllBatches: true,
      title: 'Todos os Lotes',
      campaignId: camp.id,
      campaign: {
        ...camp,
        batches: campaignBatches
      },
      contacts: batchContacts,
      stats: {
        total,
        processed,
        added,
        notAdded,
        pending,
        error,
        alreadyInGroup,
        isCompleted: pending === 0 && total > 0
      }
    };
  }

  /**
   * Obtém contatos combinados dos lotes selecionados especificamente pelo usuário
   */
  static async getSelectedBatchesCombined(userId: string, batchIds: string[]) {
    if (!batchIds || batchIds.length === 0) return null;

    const batches = await prisma.batch.findMany({
      where: {
        id: { in: batchIds },
        campaign: { userId }
      },
      include: {
        campaign: {
          include: { sourceGroup: true, destinationGroup: true }
        }
      },
      orderBy: { batchNumber: 'asc' }
    });

    if (batches.length === 0) return null;

    const campaign = batches[0].campaign;

    const allCampaignBatches = await prisma.batch.findMany({
      where: { campaignId: campaign.id },
      orderBy: { batchNumber: 'asc' },
      select: {
        id: true,
        batchNumber: true,
        targetSize: true,
        status: true,
        _count: { select: { contacts: true } }
      }
    });

    const batchContacts = await prisma.batchContact.findMany({
      where: { batchId: { in: batchIds } },
      orderBy: [
        { batch: { batchNumber: 'asc' } },
        { id: 'asc' }
      ],
      include: {
        contact: {
          include: {
            tags: { include: { tag: true } }
          }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      }
    });

    const total = batchContacts.length;
    let added = 0;
    let notAdded = 0;
    let pending = 0;
    let error = 0;
    let alreadyInGroup = 0;

    for (const c of batchContacts) {
      if (c.status === 'ADICIONADO') added++;
      else if (c.status === 'NAO_ADICIONADO') notAdded++;
      else if (c.status === 'PENDENTE') pending++;
      else if (c.status === 'ERRO') error++;
      else if (c.status === 'JA_NO_GRUPO') alreadyInGroup++;
    }

    const processed = added + notAdded + error + alreadyInGroup;

    return {
      id: 'selected',
      batchNumber: -1,
      isSelectedBatches: true,
      selectedBatchNumbers: batches.map(b => b.batchNumber),
      campaignId: campaign.id,
      campaign: {
        ...campaign,
        batches: allCampaignBatches
      },
      contacts: batchContacts,
      stats: {
        total,
        processed,
        added,
        notAdded,
        pending,
        error,
        alreadyInGroup,
        isCompleted: pending === 0 && total > 0
      }
    };
  }

  /**
   * Lista todos os lotes com contadores resumidos
   */
  static async listCampaignBatches(userId: string, campaignId?: string) {
    let campId = campaignId;
    if (!campId) {
      const latest = await prisma.campaign.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      });
      if (!latest) return [];
      campId = latest.id;
    }

    const batches = await prisma.batch.findMany({
      where: { campaignId: campId, campaign: { userId } },
      orderBy: { batchNumber: 'asc' },
      include: {
        _count: { select: { contacts: true } }
      }
    });

    const results = await Promise.all(
      batches.map(async (b) => {
        const counts = await prisma.batchContact.groupBy({
          by: ['status'],
          where: { batchId: b.id },
          _count: { _all: true }
        });

        let added = 0;
        let notAdded = 0;
        let pending = 0;

        for (const item of counts) {
          if (item.status === 'ADICIONADO') added += item._count._all;
          else if (item.status === 'NAO_ADICIONADO') notAdded += item._count._all;
          else if (item.status === 'PENDENTE') pending += item._count._all;
        }

        return {
          id: b.id,
          batchNumber: b.batchNumber,
          targetSize: b.targetSize,
          status: b.status,
          total: b._count.contacts,
          added,
          notAdded,
          pending
        };
      })
    );

    return results;
  }
}
