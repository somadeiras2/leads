import { prisma } from '../config/prisma';
import { normalizePhone } from '../utils/phone.util';
import { FilterOptions, FilterResultStats, RawScrapedContact } from '@grupoleads/shared';

export class ContactService {
  /**
   * Simula ou calcula o resultado da filtragem antes de salvar
   */
  static async previewFiltering(
    userId: string,
    rawContacts: RawScrapedContact[],
    filters: FilterOptions,
    destinationGroupId?: string | null
  ): Promise<{ stats: FilterResultStats; eligibleContacts: RawScrapedContact[] }> {
    const totalFound = rawContacts.length;
    let adminsIgnored = 0;
    let duplicatesIgnored = 0;
    let alreadyRegisteredIgnored = 0;
    let alreadyInDestinationIgnored = 0;
    let withoutIdentifierIgnored = 0;

    // 1. Ignorar primeiros N
    const firstIgnored = Math.min(filters.ignoreFirstN, totalFound);
    const afterFirstN = rawContacts.slice(firstIgnored);

    // Buscar contatos já existentes do usuário para conferência rápida
    const existingContacts = await prisma.contact.findMany({
      where: { userId },
      select: { phone: true, identifier: true }
    });
    const existingPhoneSet = new Set(existingContacts.map(c => normalizePhone(c.phone)));
    const existingIdSet = new Set(existingContacts.filter(c => c.identifier).map(c => c.identifier!));

    // Buscar contatos do grupo destino se fornecido
    let destGroupPhones = new Set<string>();
    if (destinationGroupId && filters.ignoreAlreadyInDestination) {
      const destGroupContacts = await prisma.groupContact.findMany({
        where: { groupId: destinationGroupId },
        include: { contact: true }
      });
      destGroupPhones = new Set(destGroupContacts.map(gc => normalizePhone(gc.contact.phone)));
    }

    const seenPhonesInBatch = new Set<string>();
    const eligibleContacts: RawScrapedContact[] = [];

    for (const item of afterFirstN) {
      const phoneNorm = normalizePhone(item.phone);

      // Checa se é admin
      if (filters.ignoreAdmins && item.isAdmin) {
        adminsIgnored++;
        continue;
      }

      // Checa se não possui identificador / telefone válido
      if (filters.ignoreWithoutIdentifier && (!phoneNorm || phoneNorm.length < 8)) {
        withoutIdentifierIgnored++;
        continue;
      }

      // Checa duplicados dentro do próprio lote da coleta
      if (filters.ignoreDuplicates && seenPhonesInBatch.has(phoneNorm)) {
        duplicatesIgnored++;
        continue;
      }

      // Checa se já está cadastrado no sistema
      if (filters.ignoreAlreadyRegistered && (existingPhoneSet.has(phoneNorm) || (item.identifier && existingIdSet.has(item.identifier)))) {
        alreadyRegisteredIgnored++;
        continue;
      }

      // Checa se já está presente no grupo de destino
      if (filters.ignoreAlreadyInDestination && destinationGroupId && destGroupPhones.has(phoneNorm)) {
        alreadyInDestinationIgnored++;
        continue;
      }

      seenPhonesInBatch.add(phoneNorm);
      eligibleContacts.push(item);
    }

    const stats: FilterResultStats = {
      totalFound,
      firstIgnored,
      adminsIgnored,
      duplicatesIgnored,
      alreadyRegisteredIgnored,
      alreadyInDestinationIgnored,
      withoutIdentifierIgnored,
      eligibleCount: eligibleContacts.length
    };

    return { stats, eligibleContacts };
  }

  /**
   * Salva contatos coletados com deduplicação e relacionamento de grupo
   */
  static async saveCollectedContacts(
    userId: string,
    groupName: string,
    rawContacts: RawScrapedContact[],
    filters: FilterOptions,
    waGroupId?: string,
    destinationGroupId?: string | null,
    segment?: string | null,
    tagName?: string | null
  ) {
    // Garante que o grupo de origem existe
    let group = await prisma.group.findFirst({
      where: { userId, name: groupName }
    });

    if (!group) {
      group = await prisma.group.create({
        data: {
          userId,
          name: groupName,
          waGroupId: waGroupId || null,
          description: segment || null,
          lastCollectedAt: new Date()
        }
      });
    } else {
      group = await prisma.group.update({
        where: { id: group.id },
        data: {
          lastCollectedAt: new Date(),
          description: segment || group.description,
          waGroupId: waGroupId || group.waGroupId
        }
      });
    }

    // Cria ou recupera a etiqueta de segmentação
    const targetTagName = tagName?.trim() || segment?.trim();
    let tagId: string | null = null;
    if (targetTagName) {
      const tag = await prisma.tag.upsert({
        where: {
          userId_name: { userId, name: targetTagName }
        },
        update: {},
        create: {
          userId,
          name: targetTagName,
          color: '#3b82f6'
        }
      });
      tagId = tag.id;
    }

    const { stats, eligibleContacts } = await this.previewFiltering(
      userId,
      rawContacts,
      filters,
      destinationGroupId
    );

    let savedCount = 0;
    const savedContactIds: string[] = [];
    const now = new Date();

    for (const item of eligibleContacts) {
      const phoneNorm = normalizePhone(item.phone);
      if (!phoneNorm) continue;

      // Deduplicação: busca existente
      const existing = await prisma.contact.findFirst({
        where: {
          userId,
          OR: [
            { phone: phoneNorm },
            ...(item.identifier ? [{ identifier: item.identifier }] : [])
          ]
        }
      });

      let contactId: string;

      if (existing) {
        contactId = existing.id;
        // Atualiza grupo de origem e timestamp
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            lastCollectedAt: now,
            sourceGroup: group.name,
            sourceGroupId: group.id,
            name: (existing.name === 'Sem Nome' || !existing.name) && item.name ? item.name : existing.name
          }
        });
      } else {
        const created = await prisma.contact.create({
          data: {
            userId,
            name: item.name || 'Contato WhatsApp',
            phone: phoneNorm,
            identifier: item.identifier || phoneNorm,
            status: 'NOVO',
            sourceGroup: group.name,
            sourceGroupId: group.id,
            lastCollectedAt: now
          }
        });
        contactId = created.id;
        savedCount++;
      }

      savedContactIds.push(contactId);
    }

    // Relaciona em lote com o grupo e com a etiqueta (1 única query de alta performance)
    if (savedContactIds.length > 0) {
      await prisma.groupContact.createMany({
        data: savedContactIds.map(cId => ({
          groupId: group.id,
          contactId: cId
        })),
        skipDuplicates: true
      });

      if (tagId) {
        await prisma.contactTag.createMany({
          data: savedContactIds.map(cId => ({
            contactId: cId,
            tagId
          })),
          skipDuplicates: true
        });
      }
    }

    // Registra a coleta no histórico
    const collection = await prisma.collection.create({
      data: {
        userId,
        groupId: group.id,
        groupName: group.name,
        totalFound: stats.totalFound,
        newCount: savedCount,
        duplicatesCount: stats.duplicatesIgnored + stats.alreadyRegisteredIgnored,
        ignoredCount: stats.firstIgnored + stats.adminsIgnored + stats.withoutIdentifierIgnored + stats.alreadyInDestinationIgnored
      }
    });

    return {
      collectionId: collection.id,
      groupId: group.id,
      groupName: group.name,
      stats: {
        ...stats,
        newSaved: savedCount
      }
    };
  }

  static async listContacts(userId: string, query: {
    search?: string;
    status?: string;
    groupId?: string;
    tagId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.status && query.status !== 'TODOS') {
      where.status = query.status;
    }

    if (query.groupId) {
      where.groups = {
        some: { groupId: query.groupId }
      };
    }

    if (query.tagId) {
      where.tags = {
        some: { tagId: query.tagId }
      };
    }

    if (query.search) {
      const rawSearch = query.search.trim();
      if (rawSearch.startsWith('%') && rawSearch.length > 1) {
        // Busca por final do número (ex: %0290)
        const suffix = rawSearch.slice(1).replace(/[^\d]/g, '');
        where.OR = [
          { phone: { endsWith: suffix } },
          { identifier: { endsWith: suffix } }
        ];
      } else if (rawSearch.endsWith('%') && rawSearch.length > 1) {
        // Busca por início do número (ex: 85%)
        const prefix = rawSearch.slice(0, -1).replace(/[^\d]/g, '');
        where.OR = [
          { phone: { startsWith: prefix } },
          { identifier: { startsWith: prefix } }
        ];
      } else {
        where.OR = [
          { name: { contains: rawSearch } },
          { phone: { contains: rawSearch } },
          { identifier: { contains: rawSearch } },
          { sourceGroup: { contains: rawSearch } }
        ];
      }
    }

    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          groups: {
            include: {
              group: { select: { id: true, name: true } }
            }
          },
          tags: {
            include: {
              tag: { select: { id: true, name: true, color: true } }
            }
          }
        }
      })
    ]);

    return {
      contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getContactById(userId: string, id: string) {
    return prisma.contact.findFirst({
      where: { id, userId },
      include: {
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
        batchContacts: {
          include: {
            batch: {
              include: {
                campaign: true
              }
            }
          }
        }
      }
    });
  }

  static async updateContact(userId: string, id: string, data: any) {
    const { groupIds, tagIds, ...updateFields } = data;

    if (updateFields.phone) {
      updateFields.phone = normalizePhone(updateFields.phone);
    }

    const contact = await prisma.contact.update({
      where: { id, userId },
      data: updateFields
    });

    if (tagIds && Array.isArray(tagIds)) {
      await prisma.contactTag.deleteMany({ where: { contactId: id } });
      for (const tagId of tagIds) {
        await prisma.contactTag.create({
          data: { contactId: id, tagId }
        });
      }
    }

    return this.getContactById(userId, id);
  }

  static async deleteContact(userId: string, id: string) {
    return prisma.contact.delete({
      where: { id, userId }
    });
  }

  static async deleteAllContacts(userId: string, pin: string) {
    if (pin !== '1234') {
      throw new Error('PIN de segurança incorreto. O PIN correto é 1234.');
    }

    // Limpa registros dependentes antes de remover contatos
    await prisma.campaignContact.deleteMany({ where: { contact: { userId } } });
    await prisma.batchContact.deleteMany({ where: { contact: { userId } } });
    await prisma.groupContact.deleteMany({ where: { contact: { userId } } });
    await prisma.contactTag.deleteMany({ where: { contact: { userId } } });

    const deleted = await prisma.contact.deleteMany({
      where: { userId }
    });

    return { success: true, count: deleted.count };
  }
}
