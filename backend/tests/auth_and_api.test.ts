import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

describe('FASE 28 & FASE 27: Autenticação Multi-usuário, Permissões e API REST', () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let contactUserAId: string;

  beforeAll(async () => {
    // Registra Usuário A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Usuário Alfa',
        email: `alfa_${Date.now()}@grupoleads.com`,
        password: 'password123'
      });
    userA = { id: resA.body.user.id, email: resA.body.user.email, token: resA.body.token };

    // Registra Usuário B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Usuário Beta',
        email: `beta_${Date.now()}@grupoleads.com`,
        password: 'password123'
      });
    userB = { id: resB.body.user.id, email: resB.body.user.email, token: resB.body.token };

    // Cria um contato pertencente ao Usuário A
    const contactA = await prisma.contact.create({
      data: {
        userId: userA.id,
        name: 'Lead Privado do Usuário A',
        phone: '5511999998888',
        identifier: '5511999998888',
        status: 'NOVO'
      }
    });
    contactUserAId = contactA.id;
  });

  afterAll(async () => {
    await prisma.contact.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.settings.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  });

  it('deve realizar login com sucesso e retornar token JWT válido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: userA.email,
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(userA.email);
  });

  it('GARANTIA MULTI-TENANT: Usuário B não deve conseguir acessar contato do Usuário A', async () => {
    // Usuário B tenta ler o contato do Usuário A
    const resGet = await request(app)
      .get(`/api/contacts/${contactUserAId}`)
      .set('Authorization', `Bearer ${userB.token}`);

    expect(resGet.status).toBe(404);

    // Usuário B tenta listar contatos e NÃO deve ver o contato do Usuário A
    const resList = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${userB.token}`);

    expect(resList.status).toBe(200);
    const found = resList.body.contacts.find((c: any) => c.id === contactUserAId);
    expect(found).toBeUndefined();
  });

  it('deve permitir Usuário A gerenciar seus próprios contatos e tags', async () => {
    // Criar tag
    const resTag = await request(app)
      .post('/api/tags')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'Tag Especial', color: '#8b5cf6' });

    expect(resTag.status).toBe(201);
    expect(resTag.body.name).toBe('Tag Especial');

    // Atualizar contato
    const resUpdate = await request(app)
      .put(`/api/contacts/${contactUserAId}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ status: 'VIP', notes: 'Observação importante' });

    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.status).toBe('VIP');
    expect(resUpdate.body.notes).toBe('Observação importante');
  });

  it('deve gerar arquivo de exportação XLSX/CSV respeitando escopo do usuário', async () => {
    const resExport = await request(app)
      .post('/api/exports')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        format: 'CSV',
        scope: 'ALL',
        columns: ['name', 'phone', 'status', 'createdAt']
      });

    expect(resExport.status).toBe(200);
    expect(resExport.header['content-type']).toContain('text/csv');
    expect(resExport.text).toContain('Lead Privado do Usuário A');
  });
});
