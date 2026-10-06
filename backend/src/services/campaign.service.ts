import { prisma } from '../config/prisma';
import { normalizePhone } from '../utils/phone.util';

export class CampaignService {
  /**
   * Cria uma nova campanha e divide os contatos elegíveis em lotes protegidos contra duplicidade
   */
  static async createCampaign(
    userId: string,
    data: {
      name: string;
      sourceGroupId?: string | null;
      destinationGroupId?: string | null;
      targetQuantity: number;
      batchSize: number;
      contactIds?: string[];
    }
  ) {
    const { name, sourceGroupId, destinationGroupId, targetQuantity, batchSize, contactIds } = data;

    // 1. Obter contatos elegíveis
    let candidateContacts: { id: string; phone: string }[] = [];

    if (contactIds && contactIds.length > 0) {
      candidateContacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          userId
        },
        select: { id: true, phone: true }
      });
    } else if (sourceGroupId) {
      const groupContacts = await prisma.groupContact.findMany({
        where: { groupId: sourceGroupId },
        include: {
          contact: {
            select: { id: true, phone: true, userId: true }
          }
        }
      });
      candidateContacts = groupContacts
        .filter(gc => gc.contact.userId === userId)
        .map(gc => ({ id: gc.contact.id, phone: gc.contact.phone }));
    } else {
      candidateContacts = await prisma.contact.findMany({
        where: { userId },
        take: targetQuantity,
        select: { id: true, phone: true }
      });
    }

    // 2. Proteção contra duplicidade:
    // Se houver grupo de destino, remover contatos que já estão nele
    let destinationContactPhoneSet = new Set<string>();
    if (destinationGroupId) {
      const destGroupContacts = await prisma.groupContact.findMany({
        where: { groupId: destinationGroupId },
        include: { contact: { select: { phone: true } } }
      });
      destinationContactPhoneSet = new Set(destGroupContacts.map(d => normalizePhone(d.contact.phone)));
    }

    // Filtra e deduplica candidatos
    const uniqueEligibleContacts: { id: string; phone: string }[] = [];
    const seenPhones = new Set<string>();

    for (const c of candidateContacts) {
      const normPhone = normalizePhone(c.phone);
      if (!normPhone) continue;
      if (seenPhones.has(normPhone)) continue; // Duplicado no conjunto
      if (destinationContactPhoneSet.has(normPhone)) continue; // Já presente no destino

      seenPhones.add(normPhone);
      uniqueEligibleContacts.push(c);

      if (uniqueEligibleContacts.length >= targetQuantity) {
        break;
      }
    }

    if (uniqueEligibleContacts.length === 0) {
      throw new Error('Nenhum contato elegível encontrado para criar os lotes da campanha.');
    }

    // 3. Cria a campanha no banco
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name,
        targetGoal: uniqueEligibleContacts.length,
        batchSize,
        status: 'EM_ANDAMENTO',
        sourceGroupId: sourceGroupId || null,
        destinationGroupId: destinationGroupId || null
      }
    });

    // 4. Cria os registros em campaign_contacts
    await prisma.campaignContact.createMany({
      data: uniqueEligibleContacts.map(c => ({
        campaignId: campaign.id,
        contactId: c.id
      }))
    });

    // 5. Particiona os contatos em lotes de tamanho batchSize
    const totalBatches = Math.ceil(uniqueEligibleContacts.length / batchSize);
    const assignedContactIdsInCampaign = new Set<string>();

    for (let i = 0; i < totalBatches; i++) {
      const batchNumber = i + 1;
      const sliceStart = i * batchSize;
      const sliceEnd = Math.min(sliceStart + batchSize, uniqueEligibleContacts.length);
      const batchSlice = uniqueEligibleContacts.slice(sliceStart, sliceEnd);

      const batch = await prisma.batch.create({
        data: {
          campaignId: campaign.id,
          batchNumber,
          targetSize: batchSlice.length,
          status: i === 0 ? 'EM_ANDAMENTO' : 'PENDENTE'
        }
      });

      // Cria os itens de batch_contacts garantindo unicidade estrita
      const batchContactsData = [];
      for (const item of batchSlice) {
        if (!assignedContactIdsInCampaign.has(item.id)) {
          assignedContactIdsInCampaign.add(item.id);
          batchContactsData.push({
            batchId: batch.id,
            contactId: item.id,
            status: 'PENDENTE'
          });
        }
      }

      if (batchContactsData.length > 0) {
        await prisma.batchContact.createMany({
          data: batchContactsData
        });
      }
    }

    return this.getCampaignById(userId, campaign.id);
  }

  static async listCampaigns(userId: string) {
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceGroup: { select: { id: true, name: true } },
        destinationGroup: { select: { id: true, name: true } },
        batches: {
          include: {
            _count: { select: { contacts: true } }
          }
        }
      }
    });

    // Anexa estatísticas calculadas de cada campanha
    const results = await Promise.all(
      campaigns.map(async (camp) => {
        const stats = await this.getCampaignStats(camp.id);
        return {
          ...camp,
          stats
        };
      })
    );

    return results;
  }

  static async getCampaignById(userId: string, id: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        sourceGroup: { select: { id: true, name: true } },
        destinationGroup: { select: { id: true, name: true } },
        batches: {
          orderBy: { batchNumber: 'asc' },
          include: {
            contacts: {
              include: {
                contact: {
                  include: {
                    tags: { include: { tag: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!campaign) return null;

    const stats = await this.getCampaignStats(campaign.id);
    return {
      ...campaign,
      stats
    };
  }

  static async getCampaignStats(campaignId: string) {
    const batchContacts = await prisma.batchContact.findMany({
      where: {
        batch: { campaignId }
      },
      select: { status: true }
    });

    const selected = batchContacts.length;
    let added = 0;
    let notAdded = 0;
    let pending = 0;
    let error = 0;
    let alreadyInGroup = 0;

    for (const bc of batchContacts) {
      if (bc.status === 'ADICIONADO') added++;
      else if (bc.status === 'NAO_ADICIONADO') notAdded++;
      else if (bc.status === 'PENDENTE') pending++;
      else if (bc.status === 'ERRO') error++;
      else if (bc.status === 'JA_NO_GRUPO') alreadyInGroup++;
    }

    const processed = added + notAdded + error + alreadyInGroup;
    const progressPercentage = selected > 0 ? Math.round((processed / selected) * 100) : 0;

    return {
      selected,
      processed,
      added,
      notAdded,
      pending,
      error,
      alreadyInGroup,
      progressPercentage
    };
  }

  static async updateCampaignStatus(userId: string, campaignId: string, status: string) {
    return prisma.campaign.update({
      where: { id: campaignId, userId },
      data: { status }
    });
  }

  static async deleteCampaign(userId: string, campaignId: string) {
    return prisma.campaign.delete({
      where: { id: campaignId, userId }
    });
  }
}
