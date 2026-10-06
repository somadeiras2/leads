# GRUPOLEADS — Plataforma SaaS & Extensão Chrome Manifest V3

> **Slogan:** *Organize seus contatos. Gerencie seus leads.*  
> **Propósito:** Organização ética, deduplicação avançada, categorização CRM, divisão em lotes e acompanhamento de ações manuais no WhatsApp Web.

---

## 🛡️ Declaração de Conformidade & Ética (WhatsApp)
O GRUPOLEADS opera com respeito total às diretrizes de uso:
* ❌ **NÃO** lê mensagens nem acessa o conteúdo de conversas ou mídias.
* ❌ **NÃO** faz disparos automáticos ou envio em massa.
* ❌ **NÃO** tenta burlar CAPTCHAs, limites ou controles antispam.
* ❌ **NÃO** adiciona contatos automaticamente sem supervisão humana.
* ✅ **SIM:** Apenas lê identificadores legítimos visíveis na listagem de participantes autorizados de grupos abertos pelo próprio usuário.
* ✅ **SIM:** O usuário sempre realiza a ação manual na plataforma e apenas registra o status no sistema.

---

## 🏗️ Arquitetura do Sistema

```
/
├── shared/         # Tipos TypeScript, Schemas Zod e Constantes unificadas
├── backend/        # REST API (Node.js + Express + TypeScript + Prisma ORM + JWT)
├── database/       # Schema Prisma Relacional (PostgreSQL e SQLite) + Seeds
├── dashboard/      # Painel Web SaaS (React + Vite + Tailwind CSS + Lucide Icons + Recharts)
└── extension/      # Extensão Chrome Manifest V3 (React + Vite + Content Script + Background)
```

---

## 🚀 Como Executar o Projeto

### 1. Instalação Geral
No terminal na raiz do projeto (`d:\Extrator lead`):
```bash
npm install
npm run build
```

### 2. Rodar o Backend REST API
```bash
npm run dev:backend
```
* **URL:** `http://localhost:3001`
* **Healthcheck:** `http://localhost:3001/health`
* Banco de dados local `dev.db` com Prisma ORM pré-configurado e populado.

### 3. Rodar o Painel Web (Dashboard SaaS)
Em um novo terminal:
```bash
npm run dev:dashboard
```
* **URL:** `http://localhost:5173`
* Acesso imediato ao painel com KPIs, CRM, Gestão de Grupos, Campanhas e Lotes.

### 4. Instalar a Extensão no Google Chrome / Brave / Edge
1. Abra o navegador e acesse: `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (Developer mode) no canto superior direito.
3. Clique no botão **Carregar sem compactação** (Load unpacked).
4. Selecione a pasta: `d:\Extrator lead\extension\dist`
5. A extensão **GRUPOLEADS** estará pronta e fixada na barra do navegador!

---

## ⚡ Recursos Principais Implementados

1. **Popup Compacto (Extensão Chrome):**
   * Indicador visual de status: 🟢 Conectado / 🟡 Modo Simulação.
   * Contadores: Encontrados, Novos e Já Cadastrados.
   * Filtros completos: Ignorar Primeiros N (50, 100, 150, 200, Custom), Ignorar Administradores, Ignorar Duplicados, Ignorar Já Cadastrados, Ignorar Já no Destino, Ignorar sem Identificador.
   * Prévia e tela de resultado da filtragem com cálculo em tempo real.
2. **Dashboard SaaS Moderno & Clean:**
   * **KPIs:** Contatos Totais, Únicos, Grupos, Novos, Campanhas e Lotes Pendentes.
   * **Gráficos Recharts:** Contatos por Grupo, Crescimento da Base, Desempenho das Campanhas.
   * **Continuidade de Campanha:** Banner persistente para retomar campanhas em andamento com um clique.
3. **CRM de Contatos:**
   * Tabela dinâmica com paginação, busca por nome, telefone ou grupo.
   * Filtros por status (Novo, Interessado, Cliente, VIP, Pendente, Adicionado, Não Adicionado).
   * Suporte a tags personalizadas com cores e notas de texto.
   * Seleção múltipla para criação direta de campanhas e lotes.
4. **Gerenciador de Campanhas & Lotes:**
   * Criação assistida com definição de origem, destino, meta e tamanho do lote (25, 50, 100, customizado).
   * **Proteção contra duplicidade estrita:** O mesmo contato nunca é inserido em mais de um lote da mesma campanha.
   * Tela de execução do lote: listagem com cópia rápida do número, remoção individual e botões para registro manual pós-ação (`Adicionado`, `Não adicionado`, `Já estava no grupo`).
   * Transição fluida para o próximo lote pendente.
5. **Importação e Exportação:**
   * Exportação para **XLSX** e **CSV** com seleção granular de colunas e escopo.
   * Importação inteligente com validação antecipada (Total, Novos, Duplicados, Inválidos) antes de salvar.
6. **Modo Demonstração (1 Clique):**
   * Botão **MODO DEMO** no painel: popula instantaneamente 500 contatos brasileiros, 5 grupos, 3 campanhas e 10 lotes para apresentação e testes completos sem depender de conexões externas.
7. **Multi-tenancy & Segurança:**
   * Autenticação JWT com isolamento total dos dados por usuário.
   * Testes automatizados (Vitest) cobrindo regras de negócio, deduplicação e integridade relacional.
