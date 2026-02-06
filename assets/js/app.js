import { qs, qsa, toast, formatCurrency, formatDate, toCSV, downloadFile } from "./utils.js";
import { state, setState } from "./state.js";
import { startRouter, registerRoute, navigate } from "./router.js";
import { login, signup, resetPassword, signInWithGoogle, logout, getSession, onAuthStateChange } from "./auth.js";
import { fetchWorkspaces, createWorkspace, setActiveWorkspace } from "./services/workspaces.js";
import { listAccounts, createAccount, deleteAccount } from "./services/accounts.js";
import { listTransactions, createTransaction, uploadAttachment } from "./services/transactions.js";
import { listBudgets, upsertBudget, listCategories, createCategory } from "./services/budgets.js";
import { listCards, createCard, generateInvoice, createCardPurchase, listCardPurchases, payCardInvoice } from "./services/cards.js";
import { listGoals, createGoal, addContribution } from "./services/goals.js";
import { listDebts, createDebt, payDebt } from "./services/debts.js";
import { getDashboardSummary, getCategorySpend, getMonthlyTrend, exportReport } from "./services/reports.js";
import { listNotifications, markAsRead } from "./services/notifications.js";
import { renderDashboardCharts } from "./charts/dashboardCharts.js";
import { previewCSV, mapColumns, transformRows } from "./import/csvImport.js";

const view = qs("#view");
const sidebar = qs("#sidebar");
const appShell = qs("#app");
const THEME_KEY = "financas_theme";

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const btn = qs("#themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "Modo claro" : "Modo escuro";
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(stored || (prefersDark ? "dark" : "light"));
  const btn = qs("#themeToggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const next = document.body.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }
}

function setAuthUI(isAuthed) {
  sidebar.style.display = isAuthed ? "flex" : "none";
  qs("#workspaceSelect").style.display = isAuthed ? "block" : "none";
  qs("#userBadge").style.display = isAuthed ? "block" : "none";
  if (appShell) appShell.classList.toggle("auth-mode", !isAuthed);
}

async function initSession() {
  const { data } = await getSession();
  setState({ session: data.session, user: data.session?.user || null });
  setAuthUI(!!data.session);
  if (data.session) {
    await loadWorkspaceContext();
  }
}

async function loadWorkspaceContext() {
  await fetchWorkspaces();
  renderWorkspaceSelect();
}

function renderWorkspaceSelect() {
  const select = qs("#workspaceSelect");
  select.innerHTML = state.workspaces.map(ws => `<option value="${ws.id}">${ws.name}</option>`).join("");
  select.value = state.activeWorkspaceId || "";
}

function renderUserBadge() {
  const el = qs("#userBadge");
  if (!state.user) return;
  el.textContent = state.user.email;
}

function bindTopbar() {
  qs("#workspaceSelect").addEventListener("change", e => {
    setActiveWorkspace(e.target.value);
    toast("Workspace alterado");
    navigate("#/dashboard");
  });

  qs("#logoutBtn").addEventListener("click", async () => {
    await logout();
    setState({ user: null, session: null });
    setAuthUI(false);
    navigate("#/login");
  });

  const toggle = qs("#sidebarToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
}

registerRoute("#/login", renderLogin, "Acesso");
registerRoute("#/dashboard", renderDashboard, "Dashboard");
registerRoute("#/accounts", renderAccounts, "Contas");
registerRoute("#/transactions", renderTransactions, "Transações");
registerRoute("#/budgets", renderBudgets, "Orçamento");
registerRoute("#/cards", renderCards, "Cartões");
registerRoute("#/goals", renderGoals, "Metas");
registerRoute("#/debts", renderDebts, "Dívidas");
registerRoute("#/import", renderImport, "Importação CSV");
registerRoute("#/reports", renderReports, "Relatórios");
registerRoute("#/notifications", renderNotifications, "Notificações");
registerRoute("#/lgpd", renderLGPD, "LGPD");
registerRoute("#/404", () => view.innerHTML = "<div class='state'>Página não encontrada</div>", "404");

function renderLogin() {
  setAuthUI(false);
  view.innerHTML = `
    <section class="auth">
      <div class="auth-hero">
        <div class="auth-brand">
          <span class="brand-mark">$</span>
          <div>
            <div class="brand-title">Finanças</div>
            <div class="brand-sub">Controle total do seu dinheiro</div>
          </div>
        </div>
        <div class="auth-copy">
          <h2>Organize, planeje e visualize</h2>
          <p>Centralize contas, cartões e metas em um só lugar. Relatórios claros e alertas automáticos.</p>
          <div class="auth-badges">
            <span class="badge">Rápido</span>
            <span class="badge">Seguro</span>
            <span class="badge">Cloud</span>
          </div>
        </div>
      </div>

      <div class="auth-panel card">
        <div class="card-title">Entrar</div>
        <form id="loginForm" class="auth-form">
          <input class="input" name="email" type="email" placeholder="Email" required />
          <input class="input" name="password" type="password" placeholder="Senha" required />
          <button class="btn" type="submit">Login</button>
          <button class="btn secondary" id="googleBtn" type="button">Continuar com Google</button>
        </form>

        <div class="divider"><span>ou</span></div>

        <form id="signupForm" class="auth-form">
          <input class="input" name="email" type="email" placeholder="Novo email" required />
          <input class="input" name="password" type="password" placeholder="Nova senha" required />
          <button class="btn" type="submit">Criar conta</button>
          <button class="btn ghost" id="resetBtn" type="button">Reset de senha</button>
        </form>
      </div>
    </section>
  `;

  qs("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await login(fd.get("email"), fd.get("password"));
    if (error) return toast(error.message, "error");
  });

  qs("#signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await signup(fd.get("email"), fd.get("password"));
    if (error) return toast(error.message, "error");
    toast("Conta criada. Verifique o email se necessário.");
  });

  qs("#googleBtn").addEventListener("click", async () => {
    const { error } = await signInWithGoogle();
    if (error) toast(error.message, "error");
  });

  qs("#resetBtn").addEventListener("click", async () => {
    const email = prompt("Email para reset?");
    if (!email) return;
    const { error } = await resetPassword(email);
    if (error) toast(error.message, "error");
    else toast("Email de reset enviado");
  });
}

async function renderDashboard() {
  guardAuth();
  view.innerHTML = `
    <div class="grid-4">
      <div class="kpi"><div class="label">Saldo total</div><div class="value" id="kpiBalance">-</div></div>
      <div class="kpi"><div class="label">Receitas mês</div><div class="value" id="kpiIncome">-</div></div>
      <div class="kpi"><div class="label">Despesas mês</div><div class="value" id="kpiExpense">-</div></div>
      <div class="kpi"><div class="label">Sobra mês</div><div class="value" id="kpiNet">-</div></div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-title">Despesas por categoria</div><canvas id="chartPie"></canvas></div>
      <div class="card"><div class="card-title">Evolução mensal</div><canvas id="chartLine"></canvas></div>
    </div>
    <div class="card"><div class="card-title">Orçado x Realizado</div><canvas id="chartBar"></canvas></div>
  `;

  const month = new Date().toISOString().slice(0, 7);
  const year = new Date().getFullYear();
  const summary = await getDashboardSummary(month);
  qs("#kpiBalance").textContent = formatCurrency(summary.balance);
  qs("#kpiIncome").textContent = formatCurrency(summary.income);
  qs("#kpiExpense").textContent = formatCurrency(summary.expense);
  qs("#kpiNet").textContent = formatCurrency(summary.net);

  const categories = await getCategorySpend(month);
  const trend = await getMonthlyTrend(year);
  const budgetData = categories.map(c => ({ category: c.category, budget: c.budget || 0, actual: c.total || 0 }));

  renderDashboardCharts({
    pieCtx: qs("#chartPie"),
    lineCtx: qs("#chartLine"),
    barCtx: qs("#chartBar"),
    categoryData: categories,
    trendData: trend,
    budgetData
  });
}

async function renderAccounts() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">Nova conta</div>
      <form id="accountForm" class="grid-3">
        <input class="input" name="name" placeholder="Nome" required />
        <select class="input" name="type">
          <option value="bank">Banco</option>
          <option value="cash">Dinheiro</option>
          <option value="digital">Digital</option>
        </select>
        <input class="input" name="currency" value="BRL" />
        <input class="input" name="initial_balance" type="number" step="0.01" placeholder="Saldo inicial" />
        <input class="input" name="low_balance_alert" type="number" step="0.01" placeholder="Alerta saldo baixo" />
        <button class="btn" type="submit">Salvar</button>
      </form>
    </div>
    <div class="card">
      <div class="card-title">Contas</div>
      <table class="table" id="accountsTable"></table>
    </div>
  `;

  qs("#accountForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await createAccount(Object.fromEntries(fd));
    toast("Conta criada");
    renderAccounts();
  });

  const accounts = await listAccounts();
  const accountsTable = view.querySelector("#accountsTable");
  if (!accountsTable) return;
  accountsTable.innerHTML = `
    <tr><th>Nome</th><th>Tipo</th><th>Moeda</th><th>Saldo inicial</th><th></th></tr>
    ${accounts.map(a => `
      <tr>
        <td>${a.name}</td>
        <td>${a.type}</td>
        <td>${a.currency}</td>
        <td>${formatCurrency(a.initial_balance || 0, a.currency)}</td>
        <td><button class="btn danger" data-del="${a.id}">Excluir</button></td>
      </tr>
    `).join("")}
  `;

  qsa("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await deleteAccount(btn.dataset.del);
      toast("Conta removida");
      renderAccounts();
    });
  });
}

async function renderTransactions() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">Nova transação</div>
      <form id="txForm" class="grid-3">
        <select class="input" name="type">
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
          <option value="transfer">Transferência</option>
        </select>
        <input class="input" name="amount" type="number" step="0.01" placeholder="Valor" required />
        <input class="input" name="currency" value="BRL" />
        <input class="input" name="date" type="date" required />
        <input class="input" name="description" placeholder="Descrição" />
        <select class="input" name="account_id" id="accountSelect">
          <option value="">Conta</option>
        </select>
        <select class="input" name="category_id" id="categorySelect">
          <option value="">Categoria</option>
        </select>
        <input class="input" name="attachment" type="file" />
        <button class="btn" type="submit">Salvar</button>
      </form>
    </div>
    <div class="card">
      <div class="card-title">Transações</div>
      <div class="form-row">
        <input class="input" id="filterFrom" type="date" />
        <input class="input" id="filterTo" type="date" />
      </div>
      <table class="table" id="txTable"></table>
      <button class="btn ghost" id="loadMore">Carregar mais</button>
    </div>
  `;

  qs("#txForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const attachment = fd.get("attachment");
    fd.delete("attachment");
    const tx = await createTransaction(Object.fromEntries(fd));
    if (attachment && attachment.size) {
      await uploadAttachment(attachment, tx.id);
    }
    toast("Transação salva");
    renderTransactions();
  });

  let offset = 0;

  const [accounts, categories] = await Promise.all([listAccounts(), listCategories()]);
  qs("#accountSelect").innerHTML = `<option value="">Conta</option>${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join("")}`;
  qs("#categorySelect").innerHTML = `<option value="">Categoria</option>${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}`;
  async function loadTx(append = false) {
    const from = qs("#filterFrom").value || undefined;
    const to = qs("#filterTo").value || undefined;
    const txs = await listTransactions({ from, to, offset, limit: 10 });
    const rows = txs.map(tx => `
      <tr>
        <td>${formatDate(tx.date)}</td>
        <td>${tx.type}</td>
        <td>${formatCurrency(tx.amount, tx.currency)}</td>
        <td>${tx.description || ""}</td>
      </tr>
    `).join("");
    if (append) {
      qs("#txTable").insertAdjacentHTML("beforeend", rows);
    } else {
      qs("#txTable").innerHTML = `<tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Descrição</th></tr>${rows}`;
    }
  }

  qs("#filterFrom").addEventListener("change", () => { offset = 0; loadTx(); });
  qs("#filterTo").addEventListener("change", () => { offset = 0; loadTx(); });
  qs("#loadMore").addEventListener("click", () => { offset += 10; loadTx(true); });

  loadTx();
}

async function renderBudgets() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">Categorias</div>
      <form id="catForm" class="grid-2">
        <input class="input" name="name" placeholder="Nome" required />
        <input class="input" name="parent_id" placeholder="ID categoria pai" />
        <button class="btn" type="submit">Criar</button>
      </form>
      <div id="catList"></div>
    </div>
    <div class="card">
      <div class="card-title">Orçamento mensal</div>
      <form id="budgetForm" class="grid-2">
        <select class="input" name="category_id" id="budgetCategory" required>
          <option value="">Categoria</option>
        </select>
        <input class="input" name="amount" type="number" step="0.01" placeholder="Valor" required />
        <input class="input" name="month" type="month" required />
        <button class="btn" type="submit">Salvar</button>
      </form>
      <div id="budgetList"></div>
    </div>
  `;

  qs("#catForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await createCategory(Object.fromEntries(fd));
    toast("Categoria criada");
    renderBudgets();
  });

  qs("#budgetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await upsertBudget(Object.fromEntries(fd));
    toast("Orçamento salvo");
    renderBudgets();
  });

  const categories = await listCategories();
  const budgetCategory = view.querySelector("#budgetCategory");
  if (budgetCategory) {
    budgetCategory.innerHTML = `<option value="">Categoria</option>${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}`;
  }
  const catList = view.querySelector("#catList");
  if (catList) {
    catList.innerHTML = categories.length
    ? categories.map(c => `<div class="badge">${c.name}</div>`).join(" ")
    : `<div class="state">Sem categorias</div>`;
  }

  const month = new Date().toISOString().slice(0, 7);
  const budgets = await listBudgets(month);
  const budgetList = view.querySelector("#budgetList");
  if (budgetList) {
    budgetList.innerHTML = budgets.length
    ? budgets.map(b => `<div>${b.categories?.name}: ${formatCurrency(b.amount)}</div>`).join("")
    : `<div class="state">Sem orçamentos para este mês</div>`;
  }
}

async function renderCards() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">Novo cartão</div>
      <form id="cardForm" class="grid-3">
        <input class="input" name="name" placeholder="Nome" required />
        <input class="input" name="limit_amount" type="number" step="0.01" placeholder="Limite" />
        <input class="input" name="closing_day" type="number" min="1" max="31" placeholder="Dia fechamento" />
        <input class="input" name="due_day" type="number" min="1" max="31" placeholder="Dia vencimento" />
        <button class="btn" type="submit">Salvar</button>
      </form>
    </div>
    <div class="card">
      <div class="card-title">Compra no cartão</div>
      <form id="cardPurchaseForm" class="grid-3">
        <select class="input" name="card_id" id="purchaseCard">
          <option value="">Cartão</option>
        </select>
        <input class="input" name="amount" type="number" step="0.01" placeholder="Valor" required />
        <input class="input" name="date" type="date" required />
        <input class="input" name="description" placeholder="Descrição" />
        <select class="input" name="category_id" id="purchaseCategory">
          <option value="">Categoria</option>
        </select>
        <input class="input" name="currency" value="BRL" />
        <button class="btn" type="submit">Registrar compra</button>
      </form>
      <div class="form-actions">
        <button class="btn secondary" id="payInvoiceBtn" type="button">Pagar fatura do mês</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Cartões</div>
      <div id="cardList"></div>
    </div>
  `;

  qs("#cardForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await createCard(Object.fromEntries(fd));
    toast("Cartão criado");
    renderCards();
  });

  const [cards, categories] = await Promise.all([listCards(), listCategories()]);
  qs("#purchaseCard").innerHTML = `<option value="">Cartão</option>${cards.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}`;
  qs("#purchaseCategory").innerHTML = `<option value="">Categoria</option>${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}`;

  qs("#cardPurchaseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd);
    if (!payload.card_id) return toast("Selecione um cartão");
    const date = payload.date;
    payload.card_cycle = date ? date.slice(0, 7) : new Date().toISOString().slice(0, 7);
    await createCardPurchase(payload);
    toast("Compra registrada");
    renderCards();
  });

  qs("#payInvoiceBtn").addEventListener("click", async () => {
    const cardId = qs("#purchaseCard").value;
    const cycle = prompt("Mês da fatura (YYYY-MM)");
    if (!cardId || !cycle) return;
    await payCardInvoice(cardId, cycle);
    toast("Fatura paga");
    renderCards();
  });

  qs("#cardList").innerHTML = cards.length ? cards.map(c => `
    <div class="card" style="margin-bottom:10px;">
      <div>${c.name} - Limite ${formatCurrency(c.limit_amount || 0)}</div>
      <button class="btn secondary" data-invoice="${c.id}">Gerar fatura</button>
    </div>
  `).join("") : `<div class="state">Sem cartões</div>`;

  qsa("[data-invoice]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const month = prompt("Mês (YYYY-MM)");
      const total = Number(prompt("Total da fatura"));
      if (!month || !total) return;
      await generateInvoice(btn.dataset.invoice, month, total);
      toast("Fatura registrada");
    });
  });
}

async function renderGoals() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">Nova meta</div>
      <form id="goalForm" class="grid-3">
        <input class="input" name="name" placeholder="Nome" required />
        <input class="input" name="target_amount" type="number" step="0.01" placeholder="Meta" required />
        <input class="input" name="target_date" type="date" />
        <button class="btn" type="submit">Salvar</button>
      </form>
    </div>
    <div class="card">
      <div class="card-title">Metas</div>
      <div id="goalList"></div>
    </div>
  `;

  qs("#goalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await createGoal(Object.fromEntries(fd));
    toast("Meta criada");
    renderGoals();
  });

  const goals = await listGoals();
  qs("#goalList").innerHTML = goals.length ? goals.map(g => {
    const pct = g.target_amount ? Math.min(100, (g.current_amount || 0) / g.target_amount * 100) : 0;
    return `
      <div class="card" style="margin-bottom:10px;">
        <div>${g.name}</div>
        <div class="badge">${formatCurrency(g.current_amount || 0)} / ${formatCurrency(g.target_amount || 0)}</div>
        <div style="height:8px;background:#eee;border-radius:6px;margin:8px 0;">
          <div style="height:8px;background:var(--accent);border-radius:6px;width:${pct}%;"></div>
        </div>
        <button class="btn secondary" data-goal="${g.id}">Adicionar aporte</button>
      </div>
    `;
  }).join("") : `<div class="state">Sem metas</div>`;

  qsa("[data-goal]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const amount = Number(prompt("Valor do aporte"));
      if (!amount) return;
      await addContribution(btn.dataset.goal, amount);
      toast("Aporte registrado");
      renderGoals();
    });
  });
}

async function renderDebts() {
  guardAuth();
  view.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Nova dívida</div>
        <form id="debtForm" class="grid-3">
          <input class="input" name="name" placeholder="Nome" required />
          <input class="input" name="principal_amount" type="number" step="0.01" placeholder="Valor total" required />
          <input class="input" name="creditor" placeholder="Credor" />
          <select class="input" name="debt_type" id="debtType">
            <option value="single">Única</option>
            <option value="installment">Parcelada</option>
          </select>
          <input class="input" name="installments_total" id="installmentsTotal" type="number" min="2" placeholder="Qtd parcelas" />
          <input class="input" name="start_date" id="debtStartDate" type="date" />
          <input class="input" name="monthly_amount" id="monthlyAmount" type="number" step="0.01" placeholder="Valor parcela" />
          <input class="input" name="interest_rate" type="number" step="0.01" placeholder="Juros % a.m. (opcional)" />
          <button class="btn" type="submit">Salvar</button>
        </form>
        <div class="form-help" id="debtPreview">Preencha os campos para ver a simulação.</div>
      </div>
      <div class="card">
        <div class="card-title">Resumo</div>
        <div id="debtSummary" class="stat-grid"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Dívidas</div>
      <div id="debtList" class="debt-list"></div>
    </div>
  `;

  const debtType = qs("#debtType");
  const installmentsTotal = qs("#installmentsTotal");
  const monthlyAmount = qs("#monthlyAmount");
  const debtStartDate = qs("#debtStartDate");
  const debtPreview = qs("#debtPreview");

  function toggleInstallments() {
    const isInstallment = debtType.value === "installment";
    installmentsTotal.disabled = !isInstallment;
    monthlyAmount.disabled = !isInstallment;
    debtStartDate.disabled = !isInstallment;
    if (!isInstallment) {
      installmentsTotal.value = "";
      monthlyAmount.value = "";
      debtStartDate.value = "";
    }
    updatePreview();
  }

  function updatePreview() {
    const total = Number(qs("input[name='principal_amount']").value || 0);
    const inst = Number(installmentsTotal.value || 0);
    const isInstallment = debtType.value === "installment";
    let perMonth = Number(monthlyAmount.value || 0);
    if (isInstallment && total > 0 && inst > 0) {
      perMonth = perMonth || Number((total / inst).toFixed(2));
      monthlyAmount.value = perMonth;
      debtPreview.textContent = `Parcelamento: ${inst}x de ${formatCurrency(perMonth)} (total ${formatCurrency(total)})`;
      return;
    }
    if (total > 0) {
      debtPreview.textContent = `Dívida única no valor de ${formatCurrency(total)}.`;
      return;
    }
    debtPreview.textContent = "Preencha os campos para ver a simulação.";
  }

  debtType.addEventListener("change", toggleInstallments);
  installmentsTotal.addEventListener("input", updatePreview);
  monthlyAmount.addEventListener("input", updatePreview);
  qs("input[name='principal_amount']").addEventListener("input", updatePreview);
  toggleInstallments();

  qs("#debtForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd);
    const total = Number(payload.principal_amount || 0);
    const isInstallment = payload.debt_type === "installment";
    if (!total) return toast("Informe o valor total da dívida", "error");
    if (isInstallment) {
      const inst = Number(payload.installments_total || 0);
      if (inst < 2) return toast("Informe a quantidade de parcelas", "error");
      if (!payload.start_date) return toast("Informe a data da primeira parcela", "error");
      if (!payload.monthly_amount) {
        payload.monthly_amount = Number((total / inst).toFixed(2));
      }
      payload.installments_paid = 0;
    } else {
      payload.installments_total = null;
      payload.installments_paid = null;
      payload.start_date = null;
      payload.monthly_amount = null;
    }
    delete payload.debt_type;
    payload.current_amount = payload.current_amount || total;
    await createDebt(payload);
    toast("Dívida criada");
    renderDebts();
  });

  const debts = await listDebts();
  const totalRemaining = debts.reduce((sum, d) => sum + Number(d.current_amount ?? d.principal_amount ?? 0), 0);
  const totalMonthly = debts.reduce((sum, d) => sum + Number(d.monthly_amount || 0), 0);
  const activeInstallments = debts.filter(d => d.installments_total).length;
  qs("#debtSummary").innerHTML = `
    <div class="stat">
      <div class="label">Total em aberto</div>
      <div class="value">${formatCurrency(totalRemaining)}</div>
    </div>
    <div class="stat">
      <div class="label">Parceladas ativas</div>
      <div class="value">${activeInstallments}</div>
    </div>
    <div class="stat">
      <div class="label">Parcelas/mês</div>
      <div class="value">${formatCurrency(totalMonthly)}</div>
    </div>
  `;

  qs("#debtList").innerHTML = debts.length ? debts.map(d => {
    const total = Number(d.principal_amount || 0);
    const remaining = Number(d.current_amount ?? total);
    const instTotal = d.installments_total;
    const instPaid = d.installments_paid || 0;
    const pct = instTotal ? Math.min(100, (instPaid / instTotal) * 100) : (total ? Math.min(100, (1 - remaining / total) * 100) : 0);
    let nextDue = "";
    if (instTotal && d.start_date) {
      const start = new Date(d.start_date);
      const next = new Date(start.getFullYear(), start.getMonth() + instPaid, start.getDate());
      nextDue = `Próxima: ${formatDate(next.toISOString().slice(0,10))}`;
    }
    return `
      <div class="debt-item">
        <div class="debt-header">
          <div>
            <div class="debt-title">${d.name}</div>
            <div class="debt-meta">${d.creditor || "Sem credor"} · ${instTotal ? `${instPaid}/${instTotal} parcelas` : "Única"}</div>
          </div>
          <div class="debt-amount">${formatCurrency(remaining)}</div>
        </div>
        <div class="debt-progress">
          <div class="progress">
            <div class="progress-fill" style="width:${pct}%;"></div>
          </div>
          <div class="debt-meta">${nextDue || `Restante: ${formatCurrency(remaining)}`}</div>
        </div>
        <div class="debt-actions">
          <button class="btn secondary" data-debt="${d.id}" data-amount="${d.monthly_amount || ""}">
            ${instTotal ? "Pagar parcela" : "Registrar pagamento"}
          </button>
        </div>
      </div>
    `;
  }).join("") : `<div class="state">Sem dívidas</div>`;

  qsa("[data-debt]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const suggested = btn.dataset.amount;
      const amount = Number(prompt("Valor do pagamento", suggested || ""));
      if (!amount) return;
      await payDebt(btn.dataset.debt, amount);
      toast("Pagamento registrado");
      renderDebts();
    });
  });
}

async function renderImport() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">Importar CSV</div>
      <input class="input" id="csvFile" type="file" accept=".csv" />
      <div id="csvPreview"></div>
      <button class="btn" id="applyImport">Aplicar importação</button>
    </div>
  `;

  let previewRows = [];
  let header = [];
  qs("#csvFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    previewCSV(file, (rows) => {
      previewRows = rows;
      header = rows[0] || [];
      qs("#csvPreview").innerHTML = `
        <div class="state">Cabeçalhos detectados: ${header.join(", ")}</div>
        <div class="state">Mapeamento automático: date, description, amount, type</div>
      `;
    });
  });

  qs("#applyImport").addEventListener("click", async () => {
    if (!previewRows.length) return toast("Carregue um CSV primeiro");
    const mapping = {};
    header.forEach(h => {
      const key = h.toLowerCase();
      if (key.includes("date")) mapping[h] = "date";
      if (key.includes("desc")) mapping[h] = "description";
      if (key.includes("amount") || key.includes("valor")) mapping[h] = "amount";
      if (key.includes("type")) mapping[h] = "type";
    });
    const map = mapColumns(header, mapping);
    const rows = transformRows(previewRows, map);
    for (const row of rows) {
      await createTransaction({ ...row, currency: "BRL" });
    }
    toast("Importação concluída");
  });
}

async function renderReports() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">Relatórios</div>
      <div class="form-row">
        <input class="input" id="repFrom" type="date" />
        <input class="input" id="repTo" type="date" />
      </div>
      <div class="form-actions">
        <button class="btn" id="exportCsv">Exportar CSV</button>
        <button class="btn secondary" id="exportPdf">Exportar PDF</button>
      </div>
    </div>
  `;

  qs("#exportCsv").addEventListener("click", async () => {
    const from = qs("#repFrom").value;
    const to = qs("#repTo").value;
    const data = await exportReport({ from, to });
    const rows = [["date","type","amount","currency","description"], ...data.map(d => [d.date, d.type, d.amount, d.currency, d.description])];
    downloadFile("relatorio.csv", toCSV(rows), "text/csv");
  });

  qs("#exportPdf").addEventListener("click", async () => {
    const from = qs("#repFrom").value;
    const to = qs("#repTo").value;
    const data = await exportReport({ from, to });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Relatório de Transações", 10, 10);
    data.slice(0, 30).forEach((d, i) => {
      doc.text(`${d.date} ${d.type} ${d.amount} ${d.description || ""}`.slice(0, 90), 10, 20 + i * 6);
    });
    doc.save("relatorio.pdf");
  });
}

async function renderNotifications() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">Notificações</div>
      <div id="notifList"></div>
    </div>
  `;

  const data = await listNotifications();
  qs("#notifList").innerHTML = data.length ? data.map(n => `
    <div class="card" style="margin-bottom:10px;">
      <div>${n.message}</div>
      <div class="badge ${n.is_read ? "" : "warning"}">${n.is_read ? "Lida" : "Nova"}</div>
      <button class="btn ghost" data-read="${n.id}">Marcar lida</button>
    </div>
  `).join("") : `<div class="state">Sem notificações</div>`;

  qsa("[data-read]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await markAsRead(btn.dataset.read);
      renderNotifications();
    });
  });
}

async function renderLGPD() {
  guardAuth();
  view.innerHTML = `
    <div class="card">
      <div class="card-title">LGPD</div>
      <button class="btn" id="exportData">Exportar meus dados (JSON)</button>
      <button class="btn danger" id="deleteAccount">Excluir conta</button>
    </div>
  `;

  qs("#exportData").addEventListener("click", async () => {
    const { data } = await window.supabase
      .rpc("export_user_data", { user_id: state.user.id });
    downloadFile("meus-dados.json", JSON.stringify(data, null, 2), "application/json");
  });

  qs("#deleteAccount").addEventListener("click", async () => {
    if (!confirm("Tem certeza? Essa ação é irreversível.")) return;
    await window.supabase.rpc("delete_user_account", { user_id: state.user.id });
    toast("Conta excluída");
  });
}

function guardAuth() {
  if (!state.user) {
    navigate("#/login");
    throw new Error("Not authenticated");
  }
  setAuthUI(true);
  renderUserBadge();
}

async function init() {
  initTheme();
  bindTopbar();
  await initSession();
  onAuthStateChange(async (_event, session) => {
    setState({ session, user: session?.user || null });
    setAuthUI(!!session);
    if (session) {
      await loadWorkspaceContext();
      navigate("#/dashboard");
    } else {
      navigate("#/login");
    }
  });
  startRouter();
}

init();
