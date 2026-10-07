// GRUPOLEADS — Assistente Inteligente Integrado ao WhatsApp Web
// Permite conectar a base de lotes ao WhatsApp Web para ir adicionando contatos com cadência segura e 1 clique.

const BACKEND_URL = 'https://grupoleads-api.onrender.com/api';

interface BatchContact {
  id: string;
  status: string;
  batchId?: string;
  batch?: {
    id: string;
    batchNumber: number;
  };
  contact?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface CampaignBatchSummary {
  id: string;
  batchNumber: number;
  targetSize: number;
  status: string;
  _count?: { contacts: number };
}

interface BatchData {
  id: string;
  batchNumber: number;
  title?: string;
  isAllBatches?: boolean;
  isSelectedBatches?: boolean;
  selectedBatchNumbers?: number[];
  campaignId: string;
  campaign?: {
    id?: string;
    name: string;
    intervalMinutes?: number;
    sourceGroup?: { name: string };
    destinationGroup?: { name: string };
    batches?: CampaignBatchSummary[];
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
  private availableBatches: CampaignBatchSummary[] = [];
  private selectedScopeMode: 'ALL' | 'SINGLE' | 'CUSTOM' = 'ALL';
  private selectedBatchId: string = '';
  private selectedCustomBatchIds: string[] = [];
  private isFilterModalOpen: boolean = false;

  private isAutoInserting: boolean = false;
  private autoInsertTimer: any = null;
  private autoInsertDelaySeconds: number = 3;

  private isLoading: boolean = false;
  private timerSeconds: number = 30 * 60;
  private isTimerRunning: boolean = false;
  private timerInterval: any = null;
  private scheduledTime: string = '';
  private scheduledTargetTimestamp: number | null = null;
  private scheduleTimerInterval: any = null;
  private scheduledCountdown: string = '';
  private isScheduled: boolean = false;

  init() {
    if (document.getElementById('grupoleads-assistant-root')) return;

    // Injeta estilos CSS encapsulados
    this.injectStyles();

    // Restaura configurações salvas de escopo e agendamento
    this.restoreScopeState();
    this.restoreScheduledState();

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
      @keyframes glPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(0.97); }
      }
      .gl-input {
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        outline: none;
        background: #ffffff;
        color: #1e293b;
      }
      .gl-input:focus {
        border-color: #9333ea;
        box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.15);
      }
      .gl-batch-tag {
        display: inline-block;
        background: #f1f5f9;
        color: #475569;
        font-size: 10px;
        font-weight: 800;
        padding: 1px 5px;
        border-radius: 4px;
        border: 1px solid #cbd5e1;
      }
    `;
    document.head.appendChild(styleEl);
  }

  private restoreScopeState() {
    try {
      const savedMode = localStorage.getItem('grupoleads_scope_mode') as 'ALL' | 'SINGLE' | 'CUSTOM' | null;
      if (savedMode) this.selectedScopeMode = savedMode;
      const savedBatchId = localStorage.getItem('grupoleads_scope_batch_id');
      if (savedBatchId) this.selectedBatchId = savedBatchId;
      const savedCustom = localStorage.getItem('grupoleads_scope_custom_ids');
      if (savedCustom) {
        this.selectedCustomBatchIds = JSON.parse(savedCustom);
      }
      const savedDelay = localStorage.getItem('grupoleads_auto_delay');
      if (savedDelay) {
        this.autoInsertDelaySeconds = parseInt(savedDelay, 10) || 3;
      }
    } catch (e) {}
  }

  private setScope(mode: 'ALL' | 'SINGLE' | 'CUSTOM', batchId?: string) {
    this.selectedScopeMode = mode;
    if (batchId) this.selectedBatchId = batchId;
    try {
      localStorage.setItem('grupoleads_scope_mode', mode);
      if (batchId) localStorage.setItem('grupoleads_scope_batch_id', batchId);
    } catch (e) {}
    this.loadActiveBatch();
  }

  private getScopeTitle(): string {
    if (!this.currentBatch) return 'Nenhum Lote Ativo';
    if (this.selectedScopeMode === 'ALL' || this.currentBatch.isAllBatches) {
      const batchCount = this.availableBatches.length || 'Todos';
      return `TODOS OS LOTES (${batchCount} Lotes — ${this.currentBatch.stats?.total || this.currentBatch.contacts.length} Contatos)`;
    }
    if (this.selectedScopeMode === 'CUSTOM' || this.currentBatch.isSelectedBatches) {
      const count = this.selectedCustomBatchIds.length || this.currentBatch.selectedBatchNumbers?.length || 0;
      return `LOTES SELECIONADOS (${count} Lotes — ${this.currentBatch.stats?.total || this.currentBatch.contacts.length} Contatos)`;
    }
    return `LOTE ${String(this.currentBatch.batchNumber).padStart(2, '0')} — ${this.currentBatch.stats?.total || this.currentBatch.contacts.length} Contatos`;
  }

  async loadActiveBatch() {
    this.isLoading = true;
    this.render();

    try {
      let url = `${BACKEND_URL}/batches/active`;
      let postBody: any = null;

      if (this.selectedScopeMode === 'ALL') {
        url = `${BACKEND_URL}/batches/all`;
      } else if (this.selectedScopeMode === 'CUSTOM' && this.selectedCustomBatchIds.length > 0) {
        url = `${BACKEND_URL}/batches/selected`;
        postBody = JSON.stringify({ batchIds: this.selectedCustomBatchIds });
      } else if (this.selectedScopeMode === 'SINGLE' && this.selectedBatchId) {
        url = `${BACKEND_URL}/batches/${this.selectedBatchId}`;
      }

      const res = postBody
        ? await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: postBody
          })
        : await fetch(url);

      if (res.ok) {
        const data = await res.json();
        if (data && (data.id || data.contacts)) {
          this.currentBatch = data;
          if (data.campaign?.batches && data.campaign.batches.length > 0) {
            this.availableBatches = data.campaign.batches;
          }
          if (data.campaign?.intervalMinutes) {
            this.timerSeconds = data.campaign.intervalMinutes * 60;
          }
        }
      }
    } catch (err) {
      console.warn('[GRUPOLEADS] Não foi possível carregar lotes do backend:', err);
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

  private restoreScheduledState() {
    try {
      const savedTime = localStorage.getItem('grupoleads_scheduled_time');
      const savedTarget = localStorage.getItem('grupoleads_scheduled_target');
      if (savedTime && savedTarget) {
        const targetMs = parseInt(savedTarget, 10);
        if (!isNaN(targetMs)) {
          if (targetMs > Date.now()) {
            this.scheduledTime = savedTime;
            this.scheduledTargetTimestamp = targetMs;
            this.isScheduled = true;
            this.startScheduleCountdown();
          } else {
            localStorage.removeItem('grupoleads_scheduled_time');
            localStorage.removeItem('grupoleads_scheduled_target');
          }
        }
      }
    } catch (e) {
      // Ignora erro de localStorage
    }
  }

  private setSchedule(timeStr: string) {
    if (!timeStr) {
      this.showToast('Por favor, selecione um horário válido.');
      return;
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      this.showToast('Horário inválido.');
      return;
    }

    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (target.getTime() <= now.getTime()) {
      // Se o horário já passou hoje, agenda para o dia seguinte no mesmo horário
      target.setDate(target.getDate() + 1);
    }

    this.scheduledTime = timeStr;
    this.scheduledTargetTimestamp = target.getTime();
    this.isScheduled = true;

    try {
      localStorage.setItem('grupoleads_scheduled_time', this.scheduledTime);
      localStorage.setItem('grupoleads_scheduled_target', String(this.scheduledTargetTimestamp));
    } catch (e) {}

    this.startScheduleCountdown();
    this.showToast(`⏰ Início agendado para ${this.scheduledTime}!`);
    this.render();
  }

  private cancelSchedule() {
    this.isScheduled = false;
    this.scheduledTargetTimestamp = null;
    this.scheduledCountdown = '';
    if (this.scheduleTimerInterval) {
      clearInterval(this.scheduleTimerInterval);
      this.scheduleTimerInterval = null;
    }
    try {
      localStorage.removeItem('grupoleads_scheduled_time');
      localStorage.removeItem('grupoleads_scheduled_target');
    } catch (e) {}
    this.showToast('Agendamento cancelado.');
    this.render();
  }

  private startScheduleCountdown() {
    if (this.scheduleTimerInterval) clearInterval(this.scheduleTimerInterval);

    const update = () => {
      if (!this.isScheduled || !this.scheduledTargetTimestamp) {
        if (this.scheduleTimerInterval) clearInterval(this.scheduleTimerInterval);
        return;
      }

      const now = Date.now();
      const diffMs = this.scheduledTargetTimestamp - now;

      if (diffMs <= 0) {
        // Horário agendado atingido!
        this.cancelSchedule();
        this.triggerScheduledStart();
      } else {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        this.scheduledCountdown = `${hours > 0 ? `${hours}h ` : ''}${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
        
        const el = document.getElementById('gl-schedule-countdown');
        if (el) {
          el.textContent = `Inicia em: ${this.scheduledCountdown}`;
        }
      }
    };

    update();
    this.scheduleTimerInterval = setInterval(update, 1000);
  }

  private triggerScheduledStart() {
    this.showToast('🚀 Horário agendado atingido! Iniciando operação...');
    this.playChime();

    // Abre drawer se estiver fechado
    if (!this.isOpen) {
      this.isOpen = true;
      this.render();
    }

    // Inicia cadência se não estiver ativa
    if (!this.isTimerRunning) {
      this.toggleTimer();
    }

    // Abre Adicionar Participante no WhatsApp
    this.openWhatsAppAddMember();

    // Insere o primeiro contato pendente após 1.5s
    setTimeout(() => {
      this.insertNextPendingContact();
    }, 1500);
  }

  private playChime() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }

  private getDefaultScheduleTime(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  private startAutoInsert() {
    if (!this.currentBatch?.contacts || this.currentBatch.contacts.length === 0) {
      this.showToast('Nenhum contato disponível no lote selecionado.');
      return;
    }

    const pending = this.currentBatch.contacts.filter(c => c.status === 'PENDENTE');
    if (pending.length === 0) {
      this.showToast('Todos os contatos do escopo já foram processados!');
      return;
    }

    this.isAutoInserting = true;
    this.showToast(`🚀 Auto-Inserção iniciada! Intervalo: ${this.autoInsertDelaySeconds}s`);
    this.openWhatsAppAddMember();
    this.render();

    setTimeout(() => {
      this.executeAutoInsertStep();
    }, 1000);
  }

  private stopAutoInsert() {
    this.isAutoInserting = false;
    if (this.autoInsertTimer) {
      clearTimeout(this.autoInsertTimer);
      this.autoInsertTimer = null;
    }
    this.showToast('⏸ Inserção automática pausada.');
    this.render();
  }

  private async executeAutoInsertStep() {
    if (!this.isAutoInserting) return;

    const pending = this.currentBatch?.contacts.find(c => c.status === 'PENDENTE');
    if (!pending || !pending.contact?.phone) {
      this.isAutoInserting = false;
      this.playChime();
      this.showToast('🎉 Todos os contatos deste lote foram inseridos!');
      this.render();
      return;
    }

    this.autofillPhone(pending.contact.phone);

    this.autoInsertTimer = setTimeout(async () => {
      if (!this.isAutoInserting) return;

      await this.updateContactStatus(pending.id, 'ADICIONADO');

      this.autoInsertTimer = setTimeout(() => {
        this.executeAutoInsertStep();
      }, 500);
    }, this.autoInsertDelaySeconds * 1000);
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
            <!-- Seletor de Escopo & Info dos Lotes -->
            <div class="gl-card">
              <!-- Seletor de Escopo de Lote -->
              <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">
                    📦 Selecionar Lote(s):
                  </span>
                  <button id="gl-toggle-filter-modal-btn" class="gl-btn gl-btn-outline" style="padding: 2px 7px; font-size: 10px;" title="Escolher múltiplos lotes específicos">
                    ${this.isFilterModalOpen ? '▲ Fechar' : '⚙️ Escolher Lotes'}
                  </button>
                </div>

                <select id="gl-scope-selector" class="gl-input" style="width: 100%; padding: 6px 8px; font-size: 12px; font-weight: 700; color: #0f172a; cursor: pointer; border: 1.5px solid #94a3b8; border-radius: 6px;">
                  <option value="ALL" ${this.selectedScopeMode === 'ALL' ? 'selected' : ''}>
                    🌟 TODOS OS LOTES (${this.availableBatches.length || 'Todos'} lotes • ${batch.campaign?.name || 'Campanha'})
                  </option>
                  ${this.availableBatches.map(b => `
                    <option value="${b.id}" ${this.selectedScopeMode === 'SINGLE' && this.selectedBatchId === b.id ? 'selected' : ''}>
                      📦 Lote ${String(b.batchNumber).padStart(2, '0')} (${b.targetSize || b._count?.contacts || 20} contatos)
                    </option>
                  `).join('')}
                  <option value="CUSTOM" ${this.selectedScopeMode === 'CUSTOM' ? 'selected' : ''}>
                    🎯 Personalizado (${this.selectedCustomBatchIds.length} lotes marcados)
                  </option>
                </select>
              </div>

              <!-- Painel de Seleção Personalizada (se aberto) -->
              ${this.isFilterModalOpen ? `
                <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                  <div style="font-size: 11px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">
                    Marque os lotes que deseja incluir na operação:
                  </div>
                  <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <button id="gl-check-all-btn" class="gl-btn gl-btn-outline" style="flex: 1; font-size: 10px; padding: 3px;">✔ Marcar Todos</button>
                    <button id="gl-uncheck-all-btn" class="gl-btn gl-btn-outline" style="flex: 1; font-size: 10px; padding: 3px;">✖ Desmarcar</button>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; max-height: 140px; overflow-y: auto; padding-right: 2px; margin-bottom: 8px;">
                    ${this.availableBatches.map(b => {
                      const isChecked = this.selectedCustomBatchIds.includes(b.id);
                      return `
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; background: ${isChecked ? '#dbeafe' : '#ffffff'}; border: 1px solid ${isChecked ? '#2563eb' : '#cbd5e1'}; border-radius: 6px; padding: 5px 4px; cursor: pointer;">
                          <input type="checkbox" class="gl-batch-chk" value="${b.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer;" />
                          <span>Lote ${String(b.batchNumber).padStart(2, '0')}</span>
                        </label>
                      `;
                    }).join('')}
                  </div>
                  <button id="gl-apply-filter-btn" class="gl-btn gl-btn-primary" style="width: 100%; font-size: 11px; padding: 6px;">
                    Aplicar Seleção (${this.selectedCustomBatchIds.length} Lotes)
                  </button>
                </div>
              ` : ''}

              <!-- Info do Escopo Atual -->
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                <div>
                  <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
                    ${this.getScopeTitle()}
                  </div>
                  <div style="font-size: 11px; color: #64748b;">
                    Campanha: <strong>${batch.campaign?.name || 'Campanha'}</strong>
                  </div>
                </div>
                <button id="gl-refresh-batch-btn" class="gl-btn gl-btn-outline" style="padding: 4px 8px; font-size: 11px;" title="Atualizar">🔄</button>
              </div>

              <!-- Barra de Progresso -->
              <div style="margin: 8px 0 4px 0;">
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

            <!-- Agendamento de Horário de Início -->
            <div class="gl-card" style="background: #faf5ff; border-color: #e9d5ff;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="font-size: 12px; font-weight: 700; color: #7e22ce; display: flex; align-items: center; gap: 5px;">
                  <span>⏰</span> Programar Horário de Início
                </div>
                ${this.isScheduled ? `
                  <span class="gl-badge gl-badge-rose" style="font-size: 10px; animation: glPulse 1.5s infinite;">
                    AGENDADO
                  </span>
                ` : ''}
              </div>

              ${this.isScheduled ? `
                <div style="background: #ffffff; border: 1px solid #d8b4fe; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px;">
                  <div style="font-size: 11px; color: #6b21a8; font-weight: 600;">
                    Disparo automático às: <strong style="font-size: 12px; color: #581c87;">${this.scheduledTime}</strong>
                  </div>
                  <div id="gl-schedule-countdown" style="font-size: 13px; font-family: monospace; font-weight: 800; color: #9333ea; margin-top: 3px;">
                    Inicia em: ${this.scheduledCountdown || 'calculando...'}
                  </div>
                </div>
                <button id="gl-cancel-schedule-btn" class="gl-btn gl-btn-outline" style="width: 100%; font-size: 11px; padding: 5px 8px; border-color: #f43f5e; color: #e11d48;">
                  ✖ Cancelar Agendamento
                </button>
              ` : `
                <div style="display: flex; gap: 6px; align-items: center;">
                  <input type="time" id="gl-schedule-time-input" value="${this.scheduledTime || this.getDefaultScheduleTime()}" class="gl-input" style="flex: 1; padding: 5px 8px; font-size: 13px; font-family: monospace; font-weight: 600;" />
                  <button id="gl-set-schedule-btn" class="gl-btn" style="background: #9333ea; color: #ffffff; font-size: 11px; padding: 6px 12px; font-weight: 700; cursor: pointer;">
                    ⏰ Agendar
                  </button>
                </div>
                <div style="font-size: 10px; color: #7e22ce; margin-top: 6px; line-height: 1.3;">
                  Ao atingir o horário definido, a cadência e a inclusão iniciam automaticamente.
                </div>
              `}
            </div>

            <!-- Inserção em Sequência no WhatsApp (Auto-Piloto) -->
            <div class="gl-card" style="background: #f0fdf4; border-color: #86efac;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="font-size: 12px; font-weight: 800; color: #166534; display: flex; align-items: center; gap: 5px;">
                  <span>⚡</span> Inserir no WhatsApp (Auto)
                </div>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #15803d; font-weight: 700;">
                  <span>Pausa:</span>
                  <select id="gl-auto-delay-select" class="gl-input" style="padding: 1px 4px; font-size: 10px; font-weight: 700;">
                    <option value="2" ${this.autoInsertDelaySeconds === 2 ? 'selected' : ''}>2s</option>
                    <option value="3" ${this.autoInsertDelaySeconds === 3 ? 'selected' : ''}>3s</option>
                    <option value="4" ${this.autoInsertDelaySeconds === 4 ? 'selected' : ''}>4s</option>
                    <option value="5" ${this.autoInsertDelaySeconds === 5 ? 'selected' : ''}>5s</option>
                  </select>
                </div>
              </div>

              <button id="gl-auto-insert-btn" class="gl-btn ${this.isAutoInserting ? 'gl-btn-danger' : 'gl-btn-success'}" style="width: 100%; font-size: 11px; padding: 6px 10px;">
                ${this.isAutoInserting ? '⏹ Parar Inserção Automática' : `▶ Inserir ${this.selectedScopeMode === 'ALL' ? 'Todos os Lotes' : 'Lotes'} em Sequência`}
              </button>
              <div style="font-size: 10px; color: #15803d; margin-top: 5px; line-height: 1.3;">
                ${this.isAutoInserting ? '🔄 Inserindo contatos automaticamente no WhatsApp Web...' : 'Percorre contato por contato do escopo selecionado e insere no WhatsApp.'}
              </div>
            </div>

            <!-- Ações Rápidas de Inclusão -->
            <div style="display: flex; gap: 6px;">
              <button id="gl-open-add-member-btn" class="gl-btn gl-btn-primary" style="flex: 1; font-size: 11px;">
                ➕ Abrir Adicionar no WhatsApp
              </button>
              <button id="gl-copy-all-btn" class="gl-btn gl-btn-outline" style="font-size: 11px;" title="Copiar todos os números">
                📋 Copiar Todos (${total})
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
              Contatos do Escopo (${batch.contacts.length}):
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
                        <div style="display: flex; align-items: center; gap: 5px;">
                          <span style="font-weight: 700; font-size: 13px; color: #0f172a;">${name}</span>
                          ${item.batch?.batchNumber ? `
                            <span class="gl-batch-tag">Lote ${String(item.batch.batchNumber).padStart(2, '0')}</span>
                          ` : ''}
                        </div>
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

    // Seletor de escopo de lotes
    document.getElementById('gl-scope-selector')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val === 'ALL') {
        this.isFilterModalOpen = false;
        this.setScope('ALL');
      } else if (val === 'CUSTOM') {
        this.isFilterModalOpen = true;
        this.render();
      } else {
        this.isFilterModalOpen = false;
        this.setScope('SINGLE', val);
      }
    });

    // Abrir/fechar modal de filtros personalizados
    document.getElementById('gl-toggle-filter-modal-btn')?.addEventListener('click', () => {
      this.isFilterModalOpen = !this.isFilterModalOpen;
      this.render();
    });

    // Marcar/Desmarcar todos os lotes no filtro
    document.getElementById('gl-check-all-btn')?.addEventListener('click', () => {
      this.selectedCustomBatchIds = this.availableBatches.map(b => b.id);
      this.render();
    });

    document.getElementById('gl-uncheck-all-btn')?.addEventListener('click', () => {
      this.selectedCustomBatchIds = [];
      this.render();
    });

    // Mudança individual de checkbox
    this.container?.querySelectorAll('.gl-batch-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement;
        const id = input.value;
        if (input.checked) {
          if (!this.selectedCustomBatchIds.includes(id)) {
            this.selectedCustomBatchIds.push(id);
          }
        } else {
          this.selectedCustomBatchIds = this.selectedCustomBatchIds.filter(x => x !== id);
        }
        const applyBtn = document.getElementById('gl-apply-filter-btn');
        if (applyBtn) {
          applyBtn.textContent = `Aplicar Seleção (${this.selectedCustomBatchIds.length} Lotes)`;
        }
      });
    });

    // Aplicar filtro de lotes personalizados
    document.getElementById('gl-apply-filter-btn')?.addEventListener('click', () => {
      if (this.selectedCustomBatchIds.length === 0) {
        this.showToast('Selecione pelo menos um lote.');
        return;
      }
      this.isFilterModalOpen = false;
      this.selectedScopeMode = 'CUSTOM';
      localStorage.setItem('grupoleads_scope_mode', 'CUSTOM');
      localStorage.setItem('grupoleads_scope_custom_ids', JSON.stringify(this.selectedCustomBatchIds));
      this.loadActiveBatch();
    });

    // Auto-Inserção em Sequência
    document.getElementById('gl-auto-insert-btn')?.addEventListener('click', () => {
      if (this.isAutoInserting) {
        this.stopAutoInsert();
      } else {
        this.startAutoInsert();
      }
    });

    // Delay da auto-inserção
    document.getElementById('gl-auto-delay-select')?.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLSelectElement).value, 10);
      if (val) {
        this.autoInsertDelaySeconds = val;
        localStorage.setItem('grupoleads_auto_delay', String(val));
      }
    });

    // Eventos do Agendamento
    document.getElementById('gl-set-schedule-btn')?.addEventListener('click', () => {
      const input = document.getElementById('gl-schedule-time-input') as HTMLInputElement | null;
      if (input?.value) {
        this.setSchedule(input.value);
      } else {
        this.showToast('Selecione um horário válido.');
      }
    });

    document.getElementById('gl-schedule-time-input')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        const input = e.target as HTMLInputElement;
        if (input.value) this.setSchedule(input.value);
      }
    });

    document.getElementById('gl-cancel-schedule-btn')?.addEventListener('click', () => {
      this.cancelSchedule();
    });

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
