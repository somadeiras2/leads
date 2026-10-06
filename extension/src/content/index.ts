// GRUPOLEADS — Content Script Seguro para WhatsApp Web
// Respeito estrito aos termos: NÃO lê mensagens, NÃO acessa conversas privadas, NÃO envia disparos.
import { whatsAppAssistant } from './assistant';

console.log('[GRUPOLEADS] Content script ativado no WhatsApp Web.');

// Inicializa o Assistente Flutuante no WhatsApp Web quando a página estiver pronta
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => whatsAppAssistant.init());
} else {
  whatsAppAssistant.init();
}

// 1. Detectar nome do grupo ativo
export function detectCurrentGroupName(): string {
  // Procura no cabeçalho da conversa aberta
  const header = document.querySelector('header');
  if (header) {
    const titleCandidates = header.querySelectorAll('span[title], div[role="button"] span, span[dir="auto"]');
    for (const el of titleCandidates) {
      const text = el.getAttribute('title') || el.textContent?.trim();
      // Ignora status de visto por último ou listas de números
      if (text && !text.includes('+') && !text.includes('online') && !text.includes('visto por último') && text.length > 1) {
        return text;
      }
    }
  }

  // Procura no painel lateral de dados do grupo (se estiver aberto)
  const drawer = document.querySelector('section, div[data-testid="chat-info-drawer"]');
  if (drawer) {
    const nameEl = drawer.querySelector('span[title], h2, div[title]');
    if (nameEl) {
      const text = nameEl.getAttribute('title') || nameEl.textContent?.trim();
      if (text && text.length > 1) return text;
    }
  }

  return 'Grupo WhatsApp';
}

// Encontra o elemento com scroll real dentro de um container
function findScrollContainer(root: Element): HTMLElement | null {
  const allDivs = Array.from(root.querySelectorAll('div'));

  // 1. Procura elemento com overflow-y e scrollHeight significativamente maior
  for (const div of allDivs) {
    const style = window.getComputedStyle(div);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && div.scrollHeight > div.clientHeight + 40 && div.clientHeight > 100) {
      return div as HTMLElement;
    }
  }

  // 2. Procura qualquer div com scrollHeight > clientHeight
  for (const div of allDivs) {
    if (div.scrollHeight > div.clientHeight + 60 && div.clientHeight > 150) {
      return div as HTMLElement;
    }
  }

  return null;
}

// 2. Extrai participantes por múltiplos métodos seguros com scroll automático completo
export async function scrapeGroupParticipants(): Promise<{ groupName: string; members: Array<{ name: string; phone: string; isAdmin: boolean }> }> {
  const groupName = detectCurrentGroupName();
  const membersMap = new Map<string, { name: string; phone: string; isAdmin: boolean }>();

  // Processa qualquer nó de participante e extrai telefone normalizado
  const processParticipantNode = (node: Element) => {
    const fullText = node.textContent || '';
    const titleSpan = node.querySelector('span[title]');
    const nameAttr = titleSpan ? titleSpan.getAttribute('title') || '' : '';

    // Procura padrão de telefone (+XX XX XXXXX-XXXX ou dígitos contínuos)
    const phoneMatches = fullText.match(/\+?\d[\d\s\-()]{7,}\d/g) || [];
    const isAdmin = fullText.toLowerCase().includes('admin') || fullText.toLowerCase().includes('administrador');

    for (const rawPhone of phoneMatches) {
      const cleaned = rawPhone.replace(/[^\d]/g, '');
      if (cleaned.length >= 8 && cleaned.length <= 16) {
        // Define nome legítimo
        let finalName = '';
        if (nameAttr && !nameAttr.includes('+') && nameAttr.trim().length > 1) {
          finalName = nameAttr.trim();
        } else {
          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l && !l.includes('+') && !l.toLowerCase().includes('admin'));
          finalName = lines[0] || `Contato ${cleaned.slice(-4)}`;
        }

        if (!membersMap.has(cleaned)) {
          membersMap.set(cleaned, {
            name: finalName,
            phone: cleaned,
            isAdmin
          });
        }
      }
    }
  };

  // MÉTODO 1: Modal "Pesquisar membros" / "Ver tudo" (Se estiver aberto na tela)
  const modal = document.querySelector('div[role="dialog"], div[aria-modal="true"], div[data-animate-modal-popup="true"]') ||
    Array.from(document.querySelectorAll('div')).find(d => {
      const h = d.textContent?.toLowerCase() || '';
      return (h.includes('pesquisar membros') || h.includes('membros do grupo')) && d.clientHeight > 300;
    });

  if (modal) {
    console.log('[GRUPOLEADS] Modal de membros detectado. Iniciando varredura com auto-scroll...');
    const scrollContainer = findScrollContainer(modal);

    if (scrollContainer) {
      // Inicia do topo
      scrollContainer.scrollTop = 0;
      await new Promise(r => setTimeout(r, 100));

      let lastSize = 0;
      let stalledCount = 0;
      const maxScrolls = 250; // suficiente para até 1.000+ participantes

      for (let s = 0; s < maxScrolls; s++) {
        // Processa todos os itens visíveis no DOM virtualizado
        modal.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"], div[data-testid*="contact"], div[tabindex]').forEach(processParticipantNode);

        // Verifica se novos contatos foram adicionados
        if (membersMap.size === lastSize) {
          stalledCount++;
          if (stalledCount >= 6) {
            console.log(`[GRUPOLEADS] Fim da lista atingido após ${s} scrolls. Total: ${membersMap.size}`);
            break;
          }
        } else {
          stalledCount = 0;
          lastSize = membersMap.size;
        }

        // Rola para baixo suavemente
        scrollContainer.scrollTop += 400;
        await new Promise(r => setTimeout(r, 65));
      }
    } else {
      // Coleta o que estiver renderizado
      modal.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]').forEach(processParticipantNode);
    }
  }

  // MÉTODO 2: Barra lateral ("Dados do grupo")
  const sidebar = document.querySelector('section, div[data-testid="chat-info-drawer"]');
  if (sidebar && membersMap.size < 50) {
    const sidebarScroll = findScrollContainer(sidebar);
    if (sidebarScroll) {
      for (let s = 0; s < 30; s++) {
        sidebar.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]').forEach(processParticipantNode);
        sidebarScroll.scrollTop += 400;
        await new Promise(r => setTimeout(r, 60));
      }
    } else {
      sidebar.querySelectorAll('div[role="listitem"], div[data-testid="cell-frame-container"]').forEach(processParticipantNode);
    }
  }

  // MÉTODO 3: Subtítulo do Header (telefones separados por vírgula no topo da conversa)
  const header = document.querySelector('header');
  if (header) {
    const spans = header.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent || '';
      if (text.includes(',') && text.includes('+')) {
        const parts = text.split(',');
        parts.forEach(part => {
          const phoneMatch = part.match(/\+?\d[\d\s\-()]{7,}\d/);
          if (phoneMatch) {
            const cleaned = phoneMatch[0].replace(/[^\d]/g, '');
            if (cleaned.length >= 8 && !membersMap.has(cleaned)) {
              membersMap.set(cleaned, {
                name: `Contato ${cleaned.slice(-4)}`,
                phone: cleaned,
                isAdmin: false
              });
            }
          }
        });
      }
    });
  }

  console.log(`[GRUPOLEADS] Varredura finalizada. Total de contatos únicos extraídos: ${membersMap.size}`);

  return {
    groupName,
    members: Array.from(membersMap.values())
  };
}

// Listener para comunicação com o Popup
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_STATUS') {
      const groupName = detectCurrentGroupName();
      sendResponse({
        isConnected: true,
        groupName: groupName,
        isOpen: groupName !== 'Grupo WhatsApp'
      });
      return true;
    }

    if (request.action === 'SCRAPE_PARTICIPANTS') {
      scrapeGroupParticipants().then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ error: err.message, groupName: detectCurrentGroupName(), members: [] });
      });
      return true; // async sendResponse
    }

    if (request.action === 'OPEN_ASSISTANT') {
      whatsAppAssistant.init();
      whatsAppAssistant.loadActiveBatch();
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'CLICK_VIEW_ALL') {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], span, div'));
      let clicked = false;
      for (const b of buttons) {
        const text = b.textContent?.toLowerCase() || '';
        if (text.includes('ver tudo') || text.includes('mais ') || text.includes('ver todos')) {
          (b as HTMLElement).click();
          clicked = true;
          break;
        }
      }
      sendResponse({ clicked });
      return true;
    }
  });
}
