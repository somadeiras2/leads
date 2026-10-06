// GRUPOLEADS — Assistente Inteligente Integrado ao WhatsApp Web
// Permite conectar a base de lotes ao WhatsApp Web para ir adicionando contatos com cadência segura e 1 clique.

const BACKEND_URL = 'http://localhost:3001/api';

interface BatchContact {
  id: string;
  status: string;
  contact?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface BatchData {
  id: string;
  batchNumber: number;
  campaignId: string;
  campaign?: {
    name: string;
    intervalMinutes?: number;
    sourceGroup?: { name: string };
    destinationGroup?: { name: string };
  };
  contacts: BatchContact[];
  stats?: {
    total: number;
    processed: number;
    added: number;
    notAdded: number;
    pending: number;
    isCompleted: boolean;
  };
}

class WhatsAppAssistant {
  private container: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private currentBatch: BatchData | null = null;
  private isLoading: boolean = false;
  private timerSeconds: number = 30 * 60;
  private isTimerRunning: boolean = false;
  private timerInterval: any = null;

  init() {
    if (document.getElementById('grupoleads-assistant-root')) return;

    // Injeta estilos CSS encapsulados
    this.injectStyles();

    // Cria root do assistente
    this.container = document.createElement('div');
    this.container.id = 'grupoleads-assistant-root';
    document.body.appendChild(this.container);

    this.render();

    // Configura atalhos de teclado no WhatsApp Web
    this.setupKeyboardShortcuts();

    // Tenta carregar o lote ativo da API local
    this.loadActiveBatch();

    // Inicia verificação periódica caso lote mude
    window.addEventListener('storage', (e) => {
      if (e.key === 'grupoleads_active_batch_id') {
        this.loadActiveBatch();
      }
    });
  }

  private injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.id = 'grupoleads-styles';
    styleEl.textContent = `
      #grupoleads-assistant-root {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
        z-index: 999999;
        position: relative;
      }
      .gl-trigger-btn {
        position: fixed;
        top: 12px;
        right: 110px;
        z-index: 999998;
        background: #2563eb;
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        padding: 8px 14px;
        border-radius: 20px;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 7px;
        transition: all 0.2s ease;
        border: 2px solid rgba(255, 255, 255, 0.4);
      }
      .gl-trigger-btn:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
      }
      .gl-drawer {
        position: fixed;
        top: 0;
        right: -420px;
        width: 400px;
        height: 100vh;
        background: #ffffff;
        box-shadow: -6px 0 24px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        border-left: 1px solid #e2e8f0;
      }
      .gl-drawer.open {
        right: 0;
      }
      .gl-header {
        background: #0f172a;
        color: #ffffff;
        padding: 16px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .gl-title {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: -0.02em;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .gl-subtitle {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 2px;
      }
      .gl-close-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #ffffff;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: background 0.15s;
      }
      .gl-close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .gl-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .gl-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px;
      }
      .gl-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
      }
      .gl-badge-green { background: #dcfce7; color: #15803d; }
      .gl-badge-blue { background: #dbeafe; color: #1d4ed8; }
      .gl-badge-amber { background: #fef3c7; color: #b45309; }
      .gl-badge-slate { background: #f1f5f9; color: #475569; }
      .gl-badge-rose { background: #ffe4e6; color: #be123c; }

      .gl-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 7px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;
      }
      .gl-btn-primary { background: #2563eb; color: #ffffff; }
      .gl-btn-primary:hover { background: #1d4ed8; }
      .gl-btn-success { background: #10b981; color: #ffffff; }
      .gl-btn-success:hover { background: #059669; }
      .gl-btn-danger { background: #ef4444; color: #ffffff; }
      .gl-btn-danger:hover { background: #dc2626; }
      .gl-btn-outline { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; }
      .gl-btn-outline:hover { background: #f8fafc; }

      .gl-contact-item {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: border 0.15s;
      }
      .gl-contact-item:hover {
        border-color: #93c5fd;
      }
      .gl-contact-item.added {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }
      .gl-contact-item.not-added {
        background: #fff1f2;
        border-color: #fecdd3;
      }
      .gl-shortcuts-bar {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px;
      }
      .gl-kbd-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 3px 6px;
        font-size: 11px;
        color: #334155;
        font-weight: 600;
      }
      .gl-kbd-tag kbd {
        background: #0f172a;
        color: #ffffff;
        border-radius: 4px;
        padding: 1px 5px;
        font-family: monospace;
        font-size: 10px;
        font-weight: 700;
      }
      .gl-toast {
        position: fixed;
        bottom: 20px;
        right: 420px;
        background: #0f172a;
        color: #ffffff;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 999999;
        display: none;
        animation: glFadeIn 0.2s ease;
      }
      @keyframes glFadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleEl);
  }

  async loadActiveBatch() {
    this.isLoading = true;
    this.render();

    try {
      // 1. Tenta carregar lote ativo do backend
      const res = await fetch(`${BACKEND_URL}/batches/active`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          this.currentBatch = data;
          if (data.campaign?.intervalMinutes) {
            this.timerSeconds = data.campaign.intervalMinutes * 60;
          }
        }
      }
    } catch (err) {
      console.warn('[GRUPOLEADS] Não foi possível conectar ao backend local:', err);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  private toggleDrawer() {
    this.isOpen = !this.isOpen;
    this.render();
  }

  private toggleTimer() {
    this.isTimerRunning = !this.isTimerRunning;
    if (this.isTimerRunning) {
      this.timerInterval = setInterval(() => {
        if (this.timerSeconds > 0) {
          this.timerSeconds--;
          this.updateTimerDisplay();
        } else {
          this.isTimerRunning = false;
          clearInterval(this.timerInterval);
          this.showToast('⏰ Tempo da cadência concluído! Pronto para o próximo lote.');
          this.render();
        }
      }, 1000);
    } else {
      if (this.timerInterval) clearInterval(this.timerInterval);
    }
    this.render();
  }

  private resetTimer(minutes: number = 30) {
    this.isTimerRunning = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerSeconds = minutes * 60;
    this.render();
  }

  private formatTimer(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  private updateTimerDisplay() {
    const timerEl = document.getElementById('gl-timer-val');
    if (timerEl) {
      timerEl.textContent = this.formatTimer(this.timerSeconds);
    }
  }

  // Preenche telefone e foca no WhatsApp Web
  private autofillPhone(phone: string) {
    // 1. Copia para o clipboard
    navigator.clipboard.writeText(`+${phone}`);

    // 2. Procura inputs no WhatsApp Web (busca de participantes ou busca geral)
    const activeModal = document.querySelector('div[role="dialog"], div[aria-modal="true"], section, div[data-testid="chat-info-drawer"]');
    const searchInputs = (activeModal || document).querySelectorAll(
      'input[type="text"], div[contenteditable="true"], input[data-tab="3"], div[data-testid="search-input"]'
    );

    let filled = false;
    for (const el of Array.from(searchInputs)) {
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.value = `+${phone}`;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled = true;
        break;
      } else if (el instanceof HTMLElement && el.getAttribute('contenteditable') === 'true') {
        el.focus();
        el.innerText = `+${phone}`;
        el.dispatchEvent(new InputEvent('input', { bubbles: true }));
        filled = true;
        break;
      }
    }

    if (filled) {
      this.showToast(`⚡ +${phone} copiado e inserido no campo do WhatsApp!`);
    } else {
      this.showToast(`📋 +${phone} copiado! Clique no campo de adicionar participante e cole (Ctrl+V).`);
    }
  }

  // Abre a janela de adicionar participante no WhatsApp
  private openWhatsAppAddMember() {
    const buttons = Array.from(document.querySelectorAll('div[role="button"], span, div'));
    let found = false;

    for (const b of buttons) {
      const text = b.textContent?.toLowerCase() || '';
      if (text.includes('adicionar participante') || text.includes('adicionar membros')) {
        (b as HTMLElement).click();
        found = true;
        this.showToast('Abrindo campo de adicionar participantes...');
        break;
      }
    }

    if (!found) {
      // Clica no header do grupo para abrir os dados do grupo
      const header = document.querySelector('header');
      if (header) {
        (header as HTMLElement).click();
        this.showToast('Abrindo dados do grupo. Clique em "Adicionar participante".');
      }
    }
  }

  // Atualiza status do contato no lote
  private async updateContactStatus(contactId: string, status: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/batches/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        // Atualiza localmente
        if (this.currentBatch) {
          const c = this.currentBatch.contacts.find(item => item.id === contactId);
          if (c) c.status = status;
          this.showToast(status === 'ADICIONADO' ? '✅ Marcado como Adicionado!' : 'Status registrado!');
          this.render();
        }
      }
    } catch (err) {
      console.error('[GRUPOLEADS] Erro ao atualizar status:', err);
    }
  }

  // Configura atalhos globais de teclado no WhatsApp Web
  private setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Requer Alt para não colidir com o uso normal do WhatsApp
      if (!e.altKey) return;

      const key = e.key.toLowerCase();

      // Alt + G: Abrir / Fechar Assistente
      if (key === 'g') {
        e.preventDefault();
        this.toggleDrawer();
        return;
      }

      // Alt + I: Inserir próximo contato pendente na busca
      if (key === 'i') {
        e.preventDefault();
        this.insertNextPendingContact();
        return;
      }

      // Alt + A: Marcar atual como Adicionado e avançar
      if (key === 'a') {
        e.preventDefault();
        this.markCurrentAndAdvance('ADICIONADO');
        return;
      }

      // Alt + N: Marcar atual como Não Adicionado e avançar
      if (key === 'n') {
        e.preventDefault();
        this.markCurrentAndAdvance('NAO_ADICIONADO');
        return;
      }

      // Alt + M: Abrir janela de Adicionar Participante
      if (key === 'm') {
        e.preventDefault();
        this.openWhatsAppAddMember();
        return;
      }

      // Alt + C: Copiar todos os números
      if (key === 'c') {
        e.preventDefault();
        this.copyAllPhones();
        return;
      }
    });
  }

  // Insere o próximo contato pendente no WhatsApp Web
  private insertNextPendingContact() {
    if (!this.currentBatch?.contacts || this.currentBatch.contacts.length === 0) {
      this.showToast('Nenhum lote ativo carregado.');
      return;
    }
    const pending = this.currentBatch.contacts.find(c => c.status === 'PENDENTE');
    if (pending && pending.contact?.phone) {
      this.autofillPhone(pending.contact.phone);
    } else {
      this.showToast('Todos os contatos deste lote já foram processados!');
    }
  }

  // Marca o contato pendente atual e já foca/preenche o próximo automaticamente
  private async markCurrentAndAdvance(status: string) {
    if (!this.currentBatch?.contacts || this.currentBatch.contacts.length === 0) return;
    const pending = this.currentBatch.contacts.find(c => c.status === 'PENDENTE');
    if (!pending) {
      this.showToast('Nenhum contato pendente restante neste lote.');
      return;
    }

    await this.updateContactStatus(pending.id, status);

    // Avança para o próximo pendente após atualizar
    setTimeout(() => {
      const next = this.currentBatch?.contacts.find(c => c.status === 'PENDENTE');
      if (next && next.contact?.phone) {
        this.autofillPhone(next.contact.phone);
      } else {
        this.showToast('🎉 Todos os contatos deste lote foram concluídos!');
      }
    }, 350);
  }

  // Copia todos os telefones do lote
  private copyAllPhones() {
    if (!this.currentBatch?.contacts) return;
    const phones = this.currentBatch.contacts
      .map(c => c.contact?.phone)
      .filter(Boolean)
      .join(', ');

    navigator.clipboard.writeText(phones);
    this.showToast(`📋 Todos os ${this.currentBatch.contacts.length} números copiados!`);
  }

  private showToast(msg: string) {
    let toast = document.getElementById('gl-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gl-toast';
      toast.className = 'gl-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      if (toast) toast.style.display = 'none';
    }, 3000);
  }

  private render() {
    if (!this.container) return;

    const batch = this.currentBatch;
    const total = batch?.contacts?.length || 0;
    const addedCount = batch?.contacts?.filter(c => c.status === 'ADICIONADO').length || 0;
    const processedCount = batch?.contacts?.filter(c => c.status !== 'PENDENTE').length || 0;

    this.container.innerHTML = `
      <!-- Botão Gatilho Flutuante -->
      <div id="gl-trigger-btn" class="gl-trigger-btn">
        <span style="font-size: 14px;">🟢</span>
        <span>GRUPOLEADS</span>
        ${batch ? `<span style="background: rgba(255,255,255,0.25); padding: 1px 7px; border-radius: 10px; font-size: 11px;">Lote ${String(batch.batchNumber).padStart(2, '0')} (${addedCount}/${total})</span>` : ''}
      </div>

      <!-- Drawer Lateral -->
      <div class="gl-drawer ${this.isOpen ? 'open' : ''}">
        <!-- Topo -->
        <div class="gl-header">
          <div>
            <div class="gl-title">
              <span>🟢</span> GRUPOLEADS
              <span class="gl-badge gl-badge-green" style="font-size: 10px; padding: 1px 6px;">Conectado</span>
            </div>
            <div class="gl-subtitle">Assistente de Inclusão Segura • WhatsApp Web</div>
          </div>
          <button id="gl-close-btn" class="gl-close-btn" title="Recolher">✕</button>
        </div>

        <!-- Conteúdo -->
        <div class="gl-body">
          ${this.isLoading ? `
            <div style="text-align: center; padding: 40px 0; color: #64748b;">
              <div>Carregando lotes do sistema...</div>
            </div>
          ` : !batch ? `
            <div class="gl-card" style="text-align: center; padding: 24px;">
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Nenhum Lote Ativo Encontrado</div>
              <p style="font-size: 12px; color: #64748b; margin-bottom: 14px;">
                Crie ou selecione uma campanha no painel para que os lotes apareçam aqui automaticamente.
              </p>
              <div style="display: flex; gap: 8px; justify-content: center;">
                <button id="gl-refresh-batch-btn" class="gl-btn gl-btn-primary">🔄 Buscar Lotes</button>
                <a href="http://localhost:5173" target="_blank" class="gl-btn gl-btn-outline" style="text-decoration: none;">Abrir Painel</a>
              </div>
            </div>
          ` : `
            <!-- Info do Lote & Campanha -->
            <div class="gl-card">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div>
                  <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
                    LOTE ${String(batch.batchNumber).padStart(2, '0')} — ${total} Contatos
                  </div>
                  <div style="font-size: 11px; color: #64748b;">
                    Campanha: <strong>${batch.campaign?.name || 'Campanha'}</strong>
                  </div>
                </div>
                <button id="gl-refresh-batch-btn" class="gl-btn gl-btn-outline" style="padding: 4px 8px; font-size: 11px;" title="Atualizar">🔄</button>
              </div>

              <!-- Barra de Progresso -->
              <div style="margin: 10px 0 6px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 4px;">
                  <span style="color: #2563eb;">Progresso: ${processedCount}/${total} processados</span>
                  <span style="color: #10b981;">${addedCount} adicionados</span>
                </div>
                <div style="height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${total > 0 ? (processedCount / total) * 100 : 0}%; height: 100%; background: #2563eb; transition: width 0.3s;"></div>
                </div>
              </div>
            </div>

            <!-- Cadência Anti-Bloqueio -->
            <div class="gl-card" style="background: #eff6ff; border-color: #bfdbfe;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: #1e40af;">
                  ⏱️ Cadência Anti-Bloqueio
                </div>
                <div id="gl-timer-val" style="font-family: monospace; font-size: 16px; font-weight: 800; color: #1d4ed8;">
                  ${this.formatTimer(this.timerSeconds)}
                </div>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button id="gl-timer-toggle-btn" class="gl-btn ${this.isTimerRunning ? 'gl-btn-danger' : 'gl-btn-primary'}" style="flex: 1; padding: 5px 8px;">
                  ${this.isTimerRunning ? '⏸ Pausar' : '▶ Iniciar Cadência'}
                </button>
                <button id="gl-timer-reset-btn" class="gl-btn gl-btn-outline" style="padding: 5px 8px;" title="Reiniciar 30 minutos">
                  ↺ 30m
                </button>
              </div>
            </div>

            <!-- Ações Rápidas de Inclusão -->
            <div style="display: flex; gap: 6px;">
              <button id="gl-open-add-member-btn" class="gl-btn gl-btn-primary" style="flex: 1; font-size: 11px;">
                ➕ Abrir Adicionar no WhatsApp
              </button>
              <button id="gl-copy-all-btn" class="gl-btn gl-btn-outline" style="font-size: 11px;" title="Copiar todos os números">
                📋 Copiar Todos
              </button>
            </div>

            <!-- Atalhos de Teclado no WhatsApp Web -->
            <div class="gl-shortcuts-bar">
              <div style="font-size: 11px; font-weight: 800; color: #1e293b; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                <span>⚡</span> Atalhos de Teclado (Adição Turbo):
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <div class="gl-kbd-tag"><kbd>Alt+I</kbd> Inserir na busca</div>
                <div class="gl-kbd-tag"><kbd>Alt+A</kbd> ✔ Adicionado (+próximo)</div>
                <div class="gl-kbd-tag"><kbd>Alt+N</kbd> ✖ Pular contato</div>
                <div class="gl-kbd-tag"><kbd>Alt+M</kbd> Abrir Add Membros</div>
                <div class="gl-kbd-tag"><kbd>Alt+C</kbd> Copiar todos</div>
                <div class="gl-kbd-tag"><kbd>Alt+G</kbd> Abrir/Fechar painel</div>
              </div>
            </div>

            <!-- Lista de Contatos -->
            <div style="font-size: 12px; font-weight: 700; color: #475569; margin-top: 4px;">
              Contatos do Lote (${batch.contacts.length}):
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${batch.contacts.map((item, idx) => {
                const phone = item.contact?.phone || '';
                const name = item.contact?.name || `Contato ${idx + 1}`;
                const isAdded = item.status === 'ADICIONADO';
                const isNotAdded = item.status === 'NAO_ADICIONADO';

                return `
                  <div class="gl-contact-item ${isAdded ? 'added' : isNotAdded ? 'not-added' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${name}</div>
                        <div style="font-family: monospace; font-size: 11px; color: #64748b;">+${phone}</div>
                      </div>
                      <span class="gl-badge ${isAdded ? 'gl-badge-green' : isNotAdded ? 'gl-badge-rose' : 'gl-badge-slate'}">
                        ${item.status}
                      </span>
                    </div>

                    <!-- Botões de Ação por Contato -->
                    <div style="display: flex; gap: 4px; margin-top: 2px;">
                      <button data-action="autofill" data-phone="${phone}" class="gl-btn gl-btn-primary" style="flex: 1; padding: 4px 6px; font-size: 11px;">
                        ⚡ Inserir
                      </button>
                      <button data-action="set-status" data-id="${item.id}" data-status="ADICIONADO" class="gl-btn gl-btn-success" style="padding: 4px 8px; font-size: 11px;" title="Marcar Adicionado">
                        ✔
                      </button>
                      <button data-action="set-status" data-id="${item.id}" data-status="NAO_ADICIONADO" class="gl-btn gl-btn-danger" style="padding: 4px 8px; font-size: 11px;" title="Marcar Não Adicionado">
                        ✖
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Rodapé do Drawer -->
        <div style="padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; justify-content: space-between; align-items: center;">
          <a href="http://localhost:5173" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: none; font-weight: 600;">
            Abrir Painel Completo ↗
          </a>
          <span style="font-size: 10px; color: #94a3b8;">GRUPOLEADS v1.0</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    document.getElementById('gl-trigger-btn')?.addEventListener('click', () => this.toggleDrawer());
    document.getElementById('gl-close-btn')?.addEventListener('click', () => this.toggleDrawer());
    document.getElementById('gl-refresh-batch-btn')?.addEventListener('click', () => this.loadActiveBatch());
    document.getElementById('gl-timer-toggle-btn')?.addEventListener('click', () => this.toggleTimer());
    document.getElementById('gl-timer-reset-btn')?.addEventListener('click', () => this.resetTimer(30));
    document.getElementById('gl-open-add-member-btn')?.addEventListener('click', () => this.openWhatsAppAddMember());
    document.getElementById('gl-copy-all-btn')?.addEventListener('click', () => this.copyAllPhones());

    // Eventos nos contatos
    this.container?.querySelectorAll('button[data-action="autofill"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const phone = (e.currentTarget as HTMLElement).getAttribute('data-phone');
        if (phone) this.autofillPhone(phone);
      });
    });

    this.container?.querySelectorAll('button[data-action="set-status"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const status = (e.currentTarget as HTMLElement).getAttribute('data-status');
        if (id && status) this.updateContactStatus(id, status);
      });
    });
  }
}

export const whatsAppAssistant = new WhatsAppAssistant();
