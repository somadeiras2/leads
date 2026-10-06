import * as XLSX from 'xlsx';
import { prisma } from '../config/prisma';
import { normalizePhone, formatPhoneDisplay } from '../utils/phone.util';
import { ExportConfigDTO, ImportPreviewDTO } from '@grupoleads/shared';

export class ImportExportService {
  /**
   * Gera arquivo XLSX ou CSV para exportação
   */
  static async exportContacts(userId: string, config: ExportConfigDTO): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const where: any = { userId };

    if (config.scope === 'BY_GROUP' && config.groupId) {
      where.groups = { some: { groupId: config.groupId } };
    } else if (config.scope === 'BY_TAG' && config.tagId) {
      where.tags = { some: { tagId: config.tagId } };
    } else if (config.scope === 'NEW') {
      where.status = 'NOVO';
    } else if (config.scope === 'SELECTED' && config.selectedContactIds?.length) {
      where.id = { in: config.selectedContactIds };
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        groups: { include: { group: { select: { name: true } } } },
        tags: { include: { tag: { select: { name: true } } } }
      }
    });

    // Mapear dados para as colunas selecionadas
    const rows = contacts.map(c => {
      const row: Record<string, string> = {};
      for (const col of config.columns) {
        switch (col) {
          case 'name':
            row['Nome'] = c.name || 'Sem Nome';
            break;
          case 'phone':
            row['Telefone'] = formatPhoneDisplay(c.phone);
            break;
          case 'groups':
            row['Grupos'] = c.groups.map(g => g.group.name).join(', ') || c.sourceGroup || '';
            break;
          case 'tags':
            row['Tags'] = c.tags.map(t => t.tag.name).join(', ');
            break;
          case 'status':
            row['Status'] = c.status;
            break;
          case 'createdAt':
            row['Data'] = new Date(c.createdAt).toLocaleDateString('pt-BR');
            break;
          case 'notes':
            row['Observação'] = c.notes || '';
            break;
        }
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `grupoleads_contatos_${timestamp}.${config.format === 'CSV' ? 'csv' : 'xlsx'}`;

    let buffer: Buffer;
    let mimeType: string;

    if (config.format === 'CSV') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      buffer = Buffer.from(csvOutput, 'utf-8');
      mimeType = 'text/csv; charset=utf-8';
    } else {
      buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    // Registra na tabela de exportações
    await prisma.export.create({
      data: {
        userId,
        format: config.format,
        scope: config.scope,
        rowCount: contacts.length,
        fileName
      }
    });

    return { buffer, fileName, mimeType };
  }

  /**
   * Analisa a planilha/CSV e retorna a pré-visualização com total, novos, duplicados e inválidos
   */
  static async previewImport(userId: string, fileBuffer: Buffer): Promise<ImportPreviewDTO> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    // Carrega contatos existentes para verificação
    const existingContacts = await prisma.contact.findMany({
      where: { userId },
      select: { phone: true }
    });
    const existingPhoneSet = new Set(existingContacts.map(c => normalizePhone(c.phone)));

    const seenInSheet = new Set<string>();
    let totalRows = 0;
    let newCount = 0;
    let duplicatesCount = 0;
    let invalidCount = 0;

    const previewRows: ImportPreviewDTO['previewRows'] = [];

    for (const raw of rawRows) {
      totalRows++;

      // Busca chaves flexíveis (Nome, Name, Telefone, Phone, Celular, etc.)
      const name = raw['Nome'] || raw['nome'] || raw['Name'] || raw['name'] || raw['Contato'] || 'Contato Importado';
      const rawPhone = String(raw['Telefone'] || raw['telefone'] || raw['Phone'] || raw['phone'] || raw['Celular'] || raw['celular'] || '');
      const group = raw['Grupo'] || raw['grupo'] || raw['Group'] || raw['group'] || '';
      const notes = raw['Observação'] || raw['observacao'] || raw['Observacoes'] || raw['Notes'] || '';
      const tagsRaw = raw['Tags'] || raw['tags'] || '';

      const phoneNorm = normalizePhone(rawPhone);
      let isValid = true;
      let isDuplicate = false;
      let reason: string | undefined;

      if (!phoneNorm || phoneNorm.length < 8) {
        isValid = false;
        invalidCount++;
        reason = 'Telefone inválido ou ausente';
      } else if (seenInSheet.has(phoneNorm) || existingPhoneSet.has(phoneNorm)) {
        isDuplicate = true;
        duplicatesCount++;
        reason = existingPhoneSet.has(phoneNorm) ? 'Já cadastrado no banco' : 'Duplicado no arquivo';
      } else {
        newCount++;
        seenInSheet.add(phoneNorm);
      }

      previewRows.push({
        name,
        phone: rawPhone,
        group,
        tags: typeof tagsRaw === 'string' && tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [],
        notes,
        isValid,
        isDuplicate,
        reason
      });
    }

    return {
      totalRows,
      newCount,
      duplicatesCount,
      invalidCount,
      previewRows: previewRows.slice(0, 100) // Retorna primeiras 100 para visualização leve
    };
  }

  /**
   * Confirma a importação das linhas válidas
   */
  static async confirmImport(
    userId: string,
    rows: Array<{ name: string; phone: string; group?: string; tags?: string[]; notes?: string }>
  ) {
    let imported = 0;

    for (const row of rows) {
      const phoneNorm = normalizePhone(row.phone);
      if (!phoneNorm || phoneNorm.length < 8) continue;

      // Upsert contato
      let contact = await prisma.contact.findFirst({
        where: { userId, phone: phoneNorm }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            userId,
            name: row.name || 'Contato Importado',
            phone: phoneNorm,
            identifier: phoneNorm,
            notes: row.notes || null,
            status: 'NOVO'
          }
        });
        imported++;
      }

      // Se houver grupo, cria ou associa
      if (row.group && row.group.trim()) {
        const groupName = row.group.trim();
        let group = await prisma.group.findFirst({
          where: { userId, name: groupName }
        });

        if (!group) {
          group = await prisma.group.create({
            data: { userId, name: groupName }
          });
        }

        await prisma.groupContact.upsert({
          where: {
            groupId_contactId: {
              groupId: group.id,
              contactId: contact.id
            }
          },
          create: { groupId: group.id, contactId: contact.id },
          update: {}
        });
      }

      // Se houver tags, associa
      if (row.tags && Array.isArray(row.tags)) {
        for (const tagName of row.tags) {
          if (!tagName.trim()) continue;
          let tag = await prisma.tag.findFirst({
            where: { userId, name: tagName.trim() }
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: { userId, name: tagName.trim() }
            });
          }

          await prisma.contactTag.upsert({
            where: {
              contactId_tagId: {
                contactId: contact.id,
                tagId: tag.id
              }
            },
            create: { contactId: contact.id, tagId: tag.id },
            update: {}
          });
        }
      }
    }

    return { importedCount: imported };
  }
}
