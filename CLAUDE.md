# CLAUDE.md — Crypto Signal Pro

> ⚠️ **REGRA ABSOLUTA — NUNCA VIOLAR**
>
> **Nunca escreva chaves, tokens, API keys ou credenciais em NENHUM arquivo do projeto.** Nem em `.env`, nem em código, nem em comentários, nem em `SPEC.md`, nem neste `CLAUDE.md`, nem em qualquer outro lugar. Chaves são passadas APENAS em runtime via terminal ou variáveis de ambiente do Supabase/Vercel. Violação desta regra é falha crítica — pare imediatamente e peça orientação ao usuário.

---

## Princípios de código (Andrej Karpathy)

Fonte: https://github.com/forrestchang/andrej-karpathy-skills

### 1. Think Before Coding
- Declare suposições explicitamente; pergunte quando houver incerteza.
- Apresente múltiplas interpretações em vez de escolher silenciosamente.
- Mencione abordagens mais simples e resista quando justificado.
- Pare e nomeie a confusão se algo estiver obscuro.

### 2. Simplicity First
- Implemente apenas o que foi pedido, sem features extras.
- Evite abstrações para código usado uma única vez.
- Não adicione flexibilidade/configurabilidade não solicitada.
- Pule tratamento de erro para cenários impossíveis.
- Reescreva se a implementação puder ficar substancialmente mais curta.

### 3. Surgical Changes
- Não melhore código adjacente, comentários ou formatação alheios ao pedido.
- Não refatore coisas que funcionam corretamente.
- Siga o estilo existente mesmo que você prefira outro.
- Aponte dead code não relacionado sem deletar.
- Remova apenas imports/variáveis/funções que SUAS mudanças tornaram não utilizados.
- Não remova dead code pré-existente a menos que pedido.

### 4. Goal-Driven Execution
- Transforme tarefas em metas verificáveis com critérios claros de sucesso.
- Apresente um plano curto multi-etapa com verificações para cada passo.
- Escreva testes que reproduzem bugs, depois faça-os passar.
- Garanta que testes passem antes e depois de refatorações.

---

## Stack do projeto

- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn-ui
- **Backend:** Supabase (Postgres + Auth + Edge Functions em Deno)
- **Pagamentos:** Stripe (tiers Free / Basic / Pro)
- **Deploy:** Vercel
- **i18n:** EN / PT / ES

---

## Arquivo crítico

**`supabase/functions/generate-signals/index.ts`** (1360 linhas)
Motor SMC com 3 setups. Máximo cuidado:
- Ler o arquivo **inteiro** antes de editar.
- Qualquer mudança em lógica de setup exige **teste unitário**.
- Preferir mudanças cirúrgicas (ver princípio 3).

---

## IA — migração CONCLUÍDA

Motor de sinais usa Anthropic Claude direto (Lovable AI Gateway removido).

- Integrações com IA usam `https://api.anthropic.com/v1/messages`.
- Em edge functions, a chave é lida via `Deno.env.get('ANTHROPIC_API_KEY')`.
- **Nunca** hardcode a chave (ver Regra Absoluta).

---

## Regras operacionais

- **`.env`** deve estar no `.gitignore` e nunca ser commitado.
- **Migrations Supabase já aplicadas são imutáveis** — criar uma nova migration, não editar a antiga.
- Antes de qualquer commit que toque edge functions, rodar:
  - `npm test`
  - `npx tsc --noEmit`
- **Nunca fazer `git push` sem confirmação explícita do usuário.**
