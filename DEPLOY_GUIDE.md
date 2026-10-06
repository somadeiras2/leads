# 🚀 GUIA DE DEPLOY COMPLETO — GRUPOLEADS

> **Slogan:** Organize seus contatos. Gerencie seus leads.

Este guia orienta o passo a passo completo para colocar o **GRUPOLEADS** em produção na nuvem utilizando **GitHub**, **Supabase** (Banco de Dados PostgreSQL), **Vercel** (Painel Dashboard) e **Render / Railway** (API Backend).

---

## 🗺️ Visão Geral da Arquitetura

```
┌────────────────────────────────────────────────────────┐
│                        GITHUB                          │
│               (Repositório Central)                    │
└───────┬───────────────────────────┬────────────────────┘
        │                           │
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│    VERCEL     │           │    RENDER     │
│  (Dashboard)  │ ◄───────► │   (Backend)   │
└───────────────┘           └───────┬───────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │   SUPABASE    │
                            │ (PostgreSQL)  │
                            └───────────────┘
```

---

## ⚡ PASSO 1: Configurar o Banco no Supabase (2 minutos)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **"New Project"**, defina o nome (ex: `grupoleads`) e guarde sua **Database Password**.
3. No painel do projeto, acesse **Project Settings ➔ Database ➔ Connection String**.
4. Copie a URI de conexão (formato Node.js / Prisma):
   ```
   postgresql://postgres.[PROJETO]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
5. No seu computador, no arquivo `.env` (ou temporariamente no terminal), configure:
   ```env
   DATABASE_URL="sua_url_do_supabase_aqui"
   ```
6. Execute o comando para criar todas as tabelas automaticamente no Supabase:
   ```bash
   npm run db:push:supabase
   ```
   *(O Prisma criará todas as tabelas: `users`, `contacts`, `groups`, `campaigns`, `batches`, `tags`, etc.)*

---

## 🐙 PASSO 2: Subir o Código para o GitHub

Se você ainda não inicializou o git nesta pasta, execute:

```bash
git init
git add .
git commit -m "feat: release GRUPOLEADS v1.0.0 pronto para deploy"
```

Crie um repositório no seu GitHub (público ou privado) e conecte:

```bash
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/grupoleads.git
git push -u origin main
```

---

## 🚀 PASSO 3: Deploy do Backend (Render.com ou Railway)

### Opção A: Render.com (Gratuito e Recomendado)
1. Acesse [render.com](https://render.com) e faça login com seu GitHub.
2. Clique em **"New +" ➔ "Web Service"**.
3. Selecione o repositório `grupoleads`.
4. Defina as configurações:
   - **Name:** `grupoleads-api`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build --workspace=@grupoleads/shared && npm run build --workspace=@grupoleads/backend`
   - **Start Command:** `npm run start --workspace=@grupoleads/backend`
5. Em **Environment Variables**, adicione:
   - `DATABASE_URL`: *(sua URL do Supabase)*
   - `DIRECT_URL`: *(sua URL direta do Supabase)*
   - `JWT_SECRET`: *(uma chave secreta qualquer, ex: `grupoleads_super_jwt_prod_2026`)*
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: `*`
6. Clique em **"Create Web Service"**.
7. Ao finalizar, copie a URL gerada (ex: `https://grupoleads-api.onrender.com`).

---

## ▲ PASSO 4: Deploy do Painel Web na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com seu GitHub.
2. Clique em **"Add New..." ➔ "Project"**.
3. Selecione o repositório `grupoleads`.
4. Em **Root Directory**, clique em **Edit** e selecione a pasta:
   ```
   dashboard
   ```
5. Em **Environment Variables**, adicione:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://grupoleads-api.onrender.com/api` *(use a URL que você copiou no Passo 3)*
6. Clique em **"Deploy"**.
7. Em menos de 1 minuto, seu Dashboard estará online em um link seguro HTTPS (ex: `https://grupoleads.vercel.app`)!

---

## 🧩 PASSO 5: Extensão Chrome Manifest V3

Para distribuir a extensão para seus usuários ou publicar na **Chrome Web Store**:

1. Para gerar o pacote pronto para distribuição:
   ```bash
   npm run package:extension
   ```
2. O arquivo **`grupoleads-extension.zip`** será gerado automaticamente na raiz do projeto!
3. Os usuários podem:
   - Descompactar o arquivo e carregar via `chrome://extensions/` (Modo Desenvolvedor ➔ Carregar sem compactação).
   - Ou você pode enviar este mesmo arquivo `.zip` diretamente no [Painel do Desenvolvedor da Chrome Web Store](https://chrome.google.com/webstore/devconsole).

---

## ✅ Checklist de Verificação Pós-Deploy

- [ ] Banco de dados com tabelas criadas no Supabase.
- [ ] Backend respondendo `GET https://sua-api/health` com status `ok`.
- [ ] Dashboard abrindo na Vercel com login e listagem de contatos funcionando.
- [ ] Extensão conectando na API e identificando participantes no WhatsApp Web.
