import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/prisma';
import { ContactService } from '../src/services/contact.service';
import { normalizePhone } from '../src/utils/phone.util';

describe('FASE 9 & FASE 12: Deduplicação e Filtros de Coleta', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Cria usuário isolado para o teste
    const user = await prisma.user.create({
      data: {
        name: 'Usuário Teste Filtros',
        email: `test_filters_${Date.now()}@grupoleads.com`,
        passwordHash: 'hashed123'
      }
    });
    testUserId = user.id;

    // Cria um contato já existente no banco para testar filtro de já cadastrados
    await prisma.contact.create({
      data: {
        userId: testUserId,
        name: 'Contato Pré-existente',
        phone: '5511999990001',
        identifier: '5511999990001',
        status: 'CLIENTE'
      }
    });
  });

  afterAll(async () => {
    await prisma.contact.deleteMany({ where: { userId: testUserId } });
    await prisma.group.deleteMany({ where: { userId: testUserId } });
    await prisma.collection.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  it('deve normalizar telefones brasileiros e internacionais corretamente', () => {
    expect(normalizePhone('+55 (11) 98765-4321')).toBe('5511987654321');
    expect(normalizePhone('11 98765-4321')).toBe('5511987654321');
    expect(normalizePhone('+1 (555) 123-4567')).toBe('15551234567');
  });

  it('deve aplicar filtros rigorosos: ignorar primeiros N, admins, duplicados, já cadastrados e sem identificador', async () => {
    const rawMockContacts = [
      // Primeiros 2 a serem ignorados
      { name: 'Primeiro Ignorado 1', phone: '5511900000001', isAdmin: false },
      { name: 'Primeiro Ignorado 2', phone: '5511900000002', isAdmin: false },

      // Admins
      { name: 'Admin do Grupo', phone: '5511900000003', isAdmin: true },

      // Sem identificador ou inválido
      { name: 'Sem Telefone', phone: '', isAdmin: false },
      { name: 'Telefone Curto', phone: '123', isAdmin: false },

      // Já cadastrado no banco
      { name: 'Contato Já Cadastrado', phone: '5511999990001', isAdmin: false },

      // Duplicados no próprio lote
      { name: 'Contato Válido A', phone: '5511988880001', isAdmin: false },
      { name: 'Contato Válido A Repetido', phone: '5511988880001', isAdmin: false },

      // Outro elegível
      { name: 'Contato Válido B', phone: '5511988880002', isAdmin: false }
    ];

    const filters = {
      ignoreFirstN: 2,
      ignoreAdmins: true,
      ignoreDuplicates: true,
      ignoreAlreadyRegistered: true,
      ignoreAlreadyInDestination: true,
      ignoreWithoutIdentifier: true
    };

    const { stats, eligibleContacts } = await ContactService.previewFiltering(
      testUserId,
      rawMockContacts,
      filters
    );

    expect(stats.totalFound).toBe(9);
    expect(stats.firstIgnored).toBe(2);
    expect(stats.adminsIgnored).toBe(1);
    expect(stats.withoutIdentifierIgnored).toBe(2);
    expect(stats.alreadyRegisteredIgnored).toBe(1);
    expect(stats.duplicatesIgnored).toBe(1);
    expect(stats.eligibleCount).toBe(2);
    expect(eligibleContacts).toHaveLength(2);
    expect(eligibleContacts[0].name).toBe('Contato Válido A');
    expect(eligibleContacts[1].name).toBe('Contato Válido B');
  });

  it('deve salvar contatos elegíveis e vincular ao grupo sem duplicar entidade', async () => {
    const rawMockContacts = [
      { name: 'Lead Teste 1', phone: '5511977770001', isAdmin: false },
      { name: 'Lead Teste 2', phone: '5511977770002', isAdmin: false }
    ];

    const filters = {
      ignoreFirstN: 0,
      ignoreAdmins: true,
      ignoreDuplicates: true,
      ignoreAlreadyRegistered: true,
      ignoreAlreadyInDestination: false,
      ignoreWithoutIdentifier: true
    };

    const result = await ContactService.saveCollectedContacts(
      testUserId,
      'Grupo de Teste Alpha',
      rawMockContacts,
      filters
    );

    expect(result.stats.newSaved).toBe(2);

    // Se coletar novamente com mesmo número mas em outro grupo:
    const secondResult = await ContactService.saveCollectedContacts(
      testUserId,
      'Grupo de Teste Beta',
      [{ name: 'Lead Teste 1', phone: '5511977770001', isAdmin: false }],
      { ...filters, ignoreAlreadyRegistered: false }
    );

    // O contato agora deve estar em ambos os grupos
    const contact = await prisma.contact.findFirst({
      where: { userId: testUserId, phone: '5511977770001' },
      include: { groups: { include: { group: true } } }
    });

    expect(contact?.groups).toHaveLength(2);
    const groupNames = contact?.groups.map(g => g.group.name);
    expect(groupNames).toContain('Grupo de Teste Alpha');
    expect(groupNames).toContain('Grupo de Teste Beta');
  });
});
