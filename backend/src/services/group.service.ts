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

  static async deleteGroup(userId: string, id: string) {
    return prisma.group.delete({
      where: { id, userId }
    });
  }
}
