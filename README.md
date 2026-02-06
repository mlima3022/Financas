# Finanças Pessoais (SPA + Supabase)

Sistema web completo de gestão financeira pessoal, 100% HTML/CSS/JS puro, pronto para GitHub Pages.

## Requisitos
- Conta no Supabase
- Conta no GitHub
- Navegador moderno

## Estrutura
```
/
├── index.html
├── README.md
├── config.example.js
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   ├── supabaseClient.js
│   │   ├── router.js
│   │   ├── auth.js
│   │   ├── state.js
│   │   ├── utils.js
│   │   ├── services/
│   │   │   ├── workspaces.js
│   │   │   ├── accounts.js
│   │   │   ├── transactions.js
│   │   │   ├── budgets.js
│   │   │   ├── cards.js
│   │   │   ├── goals.js
│   │   │   ├── debts.js
│   │   │   ├── reports.js
│   │   │   └── notifications.js
│   │   ├── charts/
│   │   │   └── dashboardCharts.js
│   │   └── import/
│   │       └── csvImport.js
└── supabase/
    └── migrations.sql
```

## Configuração (sem terminal)
1. Crie um projeto no Supabase.
2. Abra o **SQL Editor** e execute o conteúdo de `supabase/migrations.sql`.
3. No menu **Storage**, crie um bucket privado chamado `attachments`.
4. Em **Authentication > Providers**, habilite Google e configure `redirect URLs` com sua URL do GitHub Pages.
5. Crie `config.js` na raiz do projeto (ao lado de `index.html`), copiando `config.example.js` e preenchendo:
   ```js
   window.APP_CONFIG = {
     SUPABASE_URL: "https://xxxx.supabase.co",
     SUPABASE_ANON_KEY: "public-anon-key"
   };
   ```
6. Faça upload de todos os arquivos para um repositório GitHub.
7. Ative **GitHub Pages** em Settings > Pages (branch `main`, pasta `/`).
8. Abra a URL do GitHub Pages e use normalmente.

## Funcionalidades
- Dashboard com KPIs e gráficos
- Contas e transações com upload de comprovantes
- Categorias, subcategorias e orçamento mensal
- Cartões de crédito e faturas
- Metas e aportes
- Dívidas e pagamentos
- Importação CSV com preview
- Relatórios com exportação CSV/PDF
- Notificações in-app
- LGPD (exportar dados e excluir conta)

## Testes Manuais (checklist)
- Login e cadastro funcionam
- Login com Google redireciona corretamente
- Trocar workspace no seletor
- Criar/editar/excluir contas
- Criar transações e anexar comprovante
- Filtrar transações por período
- Criar categorias e orçamento
- Criar cartão e gerar fatura
- Criar meta e adicionar aporte
- Criar dívida e registrar pagamento
- Importar CSV e validar transações criadas
- Exportar relatório CSV e PDF
- Ver notificações e marcar como lida
- Exportar dados LGPD e excluir conta

## Observações
- `config.js` não deve ser versionado no GitHub.
- Não use `SERVICE_ROLE_KEY` no frontend.
- O sistema depende de RLS no Supabase para segurança.
