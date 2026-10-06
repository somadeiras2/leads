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

    return {
      ...batch,
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
}
