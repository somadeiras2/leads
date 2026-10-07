import { prisma } from '../config/prisma';

export class GroupService {
  static async listGroups(userId: string) {
    const groups = await prisma.group.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { contacts: true }
        }
      }
    });

    // Calcula contatos com status NOVO por grupo
    const results = await Promise.all(
      groups.map(async (group) => {
        const newContactsCount = await prisma.groupContact.count({
          where: {
            groupId: group.id,
            contact: {
              status: 'NOVO'
            }
          }
        });

        return {
          ...group,
          contactsCount: group._count.contacts,
          newContactsCount
        };
      })
    );

    return results;
  }

  static async getGroupById(userId: string, id: string) {
    return prisma.group.findFirst({
      where: { id, userId },
      include: {
        contacts: {
          include: {
            contact: {
              include: {
                tags: { include: { tag: true } }
              }
            }
          }
        },
        _count: {
          select: { contacts: true }
        }
      }
    });
  }

  static async createGroup(userId: string, data: { name: string; waGroupId?: string | null; description?: string | null }) {
    return prisma.group.create({
      data: {
        userId,
        name: data.name,
        waGroupId: data.waGroupId || null,
        description: data.description || null
      }
    });
  }

  static async updateGroup(
    userId: string,
    id: string,
    data: { name?: string; description?: string | null; tagName?: string | null }
  ) {
    const existing = await prisma.group.findFirst({
      where: { id, userId }
    });
    if (!existing) {
      throw new Error('Grupo não encontrado');
    }

    const updateData: any = {};
    if (data.name && data.name.trim()) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description;

    const updated = await prisma.group.update({
      where: { id },
      data: updateData
    });

    // Se o nome do grupo mudou, atualiza sourceGroup nos contatos
    if (data.name && data.name.trim() !== existing.name) {
      await prisma.contact.updateMany({
        where: { userId, sourceGroupId: id },
        data: { sourceGroup: data.name.trim() }
      });
    }

    // Se tagName foi informada, cria ou usa a tag e associa a TODOS os contatos do grupo
    const tagToApply = data.tagName?.trim() || data.description?.trim();
    if (tagToApply) {
      const tag = await prisma.tag.upsert({
        where: {
          userId_name: { userId, name: tagToApply }
        },
        update: {},
        create: {
          userId,
          name: tagToApply,
          color: '#3b82f6'
        }
      });

      const groupContacts = await prisma.groupContact.findMany({
        where: { groupId: id },
        select: { contactId: true }
      });

      for (const gc of groupContacts) {
        await prisma.contactTag.upsert({
          where: {
            contactId_tagId: { contactId: gc.contactId, tagId: tag.id }
          },
          create: { contactId: gc.contactId, tagId: tag.id },
          update: {}
        });
      }
    }

    return updated;
  }

  static async deleteGroup(userId: string, id: string) {
    return prisma.group.delete({
      where: { id, userId }
    });
  }
}
