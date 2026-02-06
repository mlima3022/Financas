-- Extensions
create extension if not exists "uuid-ossp";

-- Helper functions
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
before update on profiles
for each row execute procedure set_updated_at();

-- Workspaces
create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_workspaces_updated_at on workspaces;
create trigger set_workspaces_updated_at
before update on workspaces
for each row execute procedure set_updated_at();

create table if not exists workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text check (role in ('owner','admin','member','viewer')) not null default 'member',
  created_at timestamptz default now(),
  unique (workspace_id, user_id)
);

create or replace function is_workspace_member(ws_id uuid)
returns boolean as $$
  select exists(
    select 1 from workspace_members wm
    where wm.workspace_id = ws_id and wm.user_id = auth.uid()
  );
$$ language sql stable;

create or replace function workspace_role(ws_id uuid)
returns text as $$
  select wm.role from workspace_members wm
  where wm.workspace_id = ws_id and wm.user_id = auth.uid();
$$ language sql stable;

-- Accounts
create table if not exists accounts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  name text not null,
  type text check (type in ('bank','cash','digital')) not null,
  currency text not null default 'BRL',
  initial_balance numeric default 0,
  low_balance_alert numeric,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_accounts_updated_at on accounts;
create trigger set_accounts_updated_at
before update on accounts
for each row execute procedure set_updated_at();

-- Categories
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  name text not null,
  parent_id uuid references categories,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_categories_updated_at on categories;
create trigger set_categories_updated_at
before update on categories
for each row execute procedure set_updated_at();

-- Budgets
create table if not exists budgets (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  category_id uuid references categories on delete cascade,
  month text not null,
  amount numeric not null default 0,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (workspace_id, category_id, month)
);

drop trigger if exists set_budgets_updated_at on budgets;
create trigger set_budgets_updated_at
before update on budgets
for each row execute procedure set_updated_at();

-- Cards
create table if not exists cards (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  name text not null,
  limit_amount numeric default 0,
  closing_day int,
  due_day int,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_cards_updated_at on cards;
create trigger set_cards_updated_at
before update on cards
for each row execute procedure set_updated_at();

-- Goals
create table if not exists goals (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  name text not null,
  target_amount numeric default 0,
  current_amount numeric default 0,
  target_date date,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_goals_updated_at on goals;
create trigger set_goals_updated_at
before update on goals
for each row execute procedure set_updated_at();

-- Debts
create table if not exists debts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  name text not null,
  principal_amount numeric default 0,
  current_amount numeric default 0,
  interest_rate numeric,
  creditor text,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_debts_updated_at on debts;
create trigger set_debts_updated_at
before update on debts
for each row execute procedure set_updated_at();

-- Transactions
create table if not exists transactions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  account_id uuid references accounts,
  transfer_account_id uuid references accounts,
  category_id uuid references categories,
  card_id uuid references cards,
  debt_id uuid references debts,
  goal_id uuid references goals,
  type text check (type in ('income','expense','transfer')) not null,
  amount numeric not null,
  currency text not null default 'BRL',
  date date not null,
  description text,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists set_transactions_updated_at on transactions;
create trigger set_transactions_updated_at
before update on transactions
for each row execute procedure set_updated_at();

-- Attachments
create table if not exists attachments (
  id uuid primary key default uuid_generate_v4(),
  transaction_id uuid references transactions on delete cascade,
  path text not null,
  filename text,
  size bigint,
  mime text,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces on delete cascade,
  user_id uuid references auth.users on delete cascade,
  type text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Debt payments
create table if not exists debt_payments (
  id uuid primary key default uuid_generate_v4(),
  debt_id uuid references debts on delete cascade,
  amount numeric not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Functions
create or replace function add_goal_contribution(goal_id uuid, amount_value numeric)
returns void as $$
begin
  update goals
  set current_amount = coalesce(current_amount,0) + amount_value
  where id = goal_id and workspace_id in (
    select workspace_id from goals where id = goal_id
  );
end;
$$ language plpgsql security definer;

create or replace function add_debt_payment(debt_id uuid, amount_value numeric)
returns void as $$
begin
  insert into debt_payments (debt_id, amount) values (debt_id, amount_value);
  update debts
  set current_amount = greatest(coalesce(current_amount,0) - amount_value, 0)
  where id = debt_id;
end;
$$ language plpgsql security definer;

create or replace function dashboard_summary(ws_id uuid, month_value text)
returns json as $$
  select json_build_object(
    'income', coalesce(sum(case when type='income' then amount else 0 end),0),
    'expense', coalesce(sum(case when type='expense' then amount else 0 end),0),
    'net', coalesce(sum(case when type='income' then amount else 0 end),0) - coalesce(sum(case when type='expense' then amount else 0 end),0),
    'balance', coalesce(sum(case when type='income' then amount else -amount end),0)
  )
  from transactions
  where workspace_id = ws_id and to_char(date, 'YYYY-MM') = month_value;
$$ language sql stable;

create or replace function category_spend(ws_id uuid, month_value text)
returns table(category text, total numeric, budget numeric) as $$
  select c.name as category,
         coalesce(sum(t.amount),0) as total,
         coalesce(b.amount,0) as budget
  from categories c
  left join transactions t on t.category_id = c.id and t.type='expense' and to_char(t.date,'YYYY-MM') = month_value
  left join budgets b on b.category_id = c.id and b.month = month_value
  where c.workspace_id = ws_id
  group by c.name, b.amount;
$$ language sql stable;

create or replace function monthly_trend(ws_id uuid, year_value int)
returns table(month text, net numeric) as $$
  select to_char(date, 'YYYY-MM') as month,
         sum(case when type='income' then amount else -amount end) as net
  from transactions
  where workspace_id = ws_id and extract(year from date) = year_value
  group by 1
  order by 1;
$$ language sql stable;

create or replace function export_user_data(user_id uuid)
returns json as $$
  select json_build_object(
    'profiles', (select json_agg(p) from profiles p where p.id = user_id),
    'workspaces', (select json_agg(w) from workspaces w join workspace_members wm on wm.workspace_id=w.id where wm.user_id=user_id),
    'accounts', (select json_agg(a) from accounts a join workspace_members wm on wm.workspace_id=a.workspace_id where wm.user_id=user_id),
    'transactions', (select json_agg(t) from transactions t join workspace_members wm on wm.workspace_id=t.workspace_id where wm.user_id=user_id),
    'budgets', (select json_agg(b) from budgets b join workspace_members wm on wm.workspace_id=b.workspace_id where wm.user_id=user_id),
    'cards', (select json_agg(c) from cards c join workspace_members wm on wm.workspace_id=c.workspace_id where wm.user_id=user_id),
    'goals', (select json_agg(g) from goals g join workspace_members wm on wm.workspace_id=g.workspace_id where wm.user_id=user_id),
    'debts', (select json_agg(d) from debts d join workspace_members wm on wm.workspace_id=d.workspace_id where wm.user_id=user_id)
  );
$$ language sql stable security definer;

create or replace function delete_user_account(user_id uuid)
returns void as $$
begin
  delete from profiles where id = user_id;
  delete from auth.users where id = user_id;
end;
$$ language plpgsql security definer;

-- Notifications trigger
create or replace function check_notifications()
returns trigger as $$
declare
  total_expense numeric;
  budget_value numeric;
  card_total numeric;
  card_limit numeric;
  acct_balance numeric;
  acct_alert numeric;
begin
  if new.type = 'expense' and new.category_id is not null then
    select coalesce(sum(amount),0) into total_expense
    from transactions
    where category_id = new.category_id and to_char(date,'YYYY-MM') = to_char(new.date,'YYYY-MM');

    select coalesce(amount,0) into budget_value
    from budgets where category_id = new.category_id and month = to_char(new.date,'YYYY-MM');

    if budget_value > 0 and total_expense > budget_value then
      insert into notifications (workspace_id, user_id, type, message)
      values (new.workspace_id, new.created_by, 'budget', 'Orçamento estourado na categoria');
    end if;
  end if;

  if new.card_id is not null then
    select coalesce(sum(amount),0) into card_total
    from transactions
    where card_id = new.card_id and to_char(date,'YYYY-MM') = to_char(new.date,'YYYY-MM');
    select coalesce(limit_amount,0) into card_limit from cards where id = new.card_id;
    if card_limit > 0 and card_total > card_limit then
      insert into notifications (workspace_id, user_id, type, message)
      values (new.workspace_id, new.created_by, 'card', 'Limite do cartão excedido');
    end if;
  end if;

  if new.account_id is not null then
    select coalesce(initial_balance,0) +
           coalesce(sum(case when type='income' then amount else -amount end),0)
      into acct_balance
    from accounts a
    left join transactions t on t.account_id = a.id
    where a.id = new.account_id
    group by a.initial_balance;

    select low_balance_alert into acct_alert from accounts where id = new.account_id;
    if acct_alert is not null and acct_balance < acct_alert then
      insert into notifications (workspace_id, user_id, type, message)
      values (new.workspace_id, new.created_by, 'balance', 'Saldo baixo na conta');
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notifications on transactions;
create trigger trg_notifications
after insert on transactions
for each row execute procedure check_notifications();

-- Storage policies for attachments bucket
-- NOTE: policies on storage.objects must be created by the table owner (postgres).
create or replace function storage_workspace_id(object_name text)
returns uuid as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$ language sql stable;

-- New user setup
create or replace function handle_new_user()
returns trigger as $$
declare
  ws_id uuid;
begin
  insert into profiles (id, full_name) values (new.id, new.email);
  insert into workspaces (name, created_by) values ('Meu workspace', new.id) returning id into ws_id;
  insert into workspace_members (workspace_id, user_id, role) values (ws_id, new.id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table budgets enable row level security;
alter table cards enable row level security;
alter table goals enable row level security;
alter table debts enable row level security;
alter table transactions enable row level security;
alter table attachments enable row level security;
alter table notifications enable row level security;
alter table debt_payments enable row level security;

-- Defaults for created_by
alter table workspaces alter column created_by set default auth.uid();
alter table accounts alter column created_by set default auth.uid();
alter table categories alter column created_by set default auth.uid();
alter table budgets alter column created_by set default auth.uid();
alter table cards alter column created_by set default auth.uid();
alter table goals alter column created_by set default auth.uid();
alter table debts alter column created_by set default auth.uid();
alter table transactions alter column created_by set default auth.uid();

-- Policies
drop policy if exists "Profiles are self" on profiles;
drop policy if exists "Profiles update self" on profiles;
drop policy if exists "Workspace members can read" on workspaces;
drop policy if exists "Workspace owners can insert" on workspaces;
drop policy if exists "Workspace owners can update" on workspaces;
drop policy if exists "Workspace members read members" on workspace_members;
drop policy if exists "Owners manage members" on workspace_members;
drop policy if exists "Owners update members" on workspace_members;
drop policy if exists "Owners delete members" on workspace_members;
drop policy if exists "Members read accounts" on accounts;
drop policy if exists "Members write accounts" on accounts;
drop policy if exists "Members update accounts" on accounts;
drop policy if exists "Members delete accounts" on accounts;
drop policy if exists "Members read categories" on categories;
drop policy if exists "Members write categories" on categories;
drop policy if exists "Members update categories" on categories;
drop policy if exists "Members delete categories" on categories;
drop policy if exists "Members read budgets" on budgets;
drop policy if exists "Members write budgets" on budgets;
drop policy if exists "Members update budgets" on budgets;
drop policy if exists "Members delete budgets" on budgets;
drop policy if exists "Members read cards" on cards;
drop policy if exists "Members write cards" on cards;
drop policy if exists "Members update cards" on cards;
drop policy if exists "Members delete cards" on cards;
drop policy if exists "Members read goals" on goals;
drop policy if exists "Members write goals" on goals;
drop policy if exists "Members update goals" on goals;
drop policy if exists "Members delete goals" on goals;
drop policy if exists "Members read debts" on debts;
drop policy if exists "Members write debts" on debts;
drop policy if exists "Members update debts" on debts;
drop policy if exists "Members delete debts" on debts;
drop policy if exists "Members read transactions" on transactions;
drop policy if exists "Members write transactions" on transactions;
drop policy if exists "Members update transactions" on transactions;
drop policy if exists "Members delete transactions" on transactions;
drop policy if exists "Members read attachments" on attachments;
drop policy if exists "Members write attachments" on attachments;
drop policy if exists "Members read notifications" on notifications;
drop policy if exists "Members update notifications" on notifications;
drop policy if exists "Members read debt payments" on debt_payments;
drop policy if exists "Members write debt payments" on debt_payments;

create policy "Profiles are self" on profiles
  for select using (auth.uid() = id);

create policy "Profiles update self" on profiles
  for update using (auth.uid() = id);

create policy "Workspace members can read" on workspaces
  for select using (is_workspace_member(id));

create policy "Workspace owners can insert" on workspaces
  for insert with check (auth.uid() = created_by);

create policy "Workspace owners can update" on workspaces
  for update using (workspace_role(id) in ('owner','admin'));

create policy "Workspace members read members" on workspace_members
  for select using (is_workspace_member(workspace_id));

create policy "Owners manage members" on workspace_members
  for insert with check (workspace_role(workspace_id) in ('owner','admin'));

create policy "Owners update members" on workspace_members
  for update using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Owners delete members" on workspace_members
  for delete using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Members read accounts" on accounts
  for select using (is_workspace_member(workspace_id));

create policy "Members write accounts" on accounts
  for insert with check (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members update accounts" on accounts
  for update using (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members delete accounts" on accounts
  for delete using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Members read categories" on categories
  for select using (is_workspace_member(workspace_id));

create policy "Members write categories" on categories
  for insert with check (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members update categories" on categories
  for update using (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members delete categories" on categories
  for delete using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Members read budgets" on budgets
  for select using (is_workspace_member(workspace_id));

create policy "Members write budgets" on budgets
  for insert with check (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members update budgets" on budgets
  for update using (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members delete budgets" on budgets
  for delete using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Members read cards" on cards
  for select using (is_workspace_member(workspace_id));

create policy "Members write cards" on cards
  for insert with check (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members update cards" on cards
  for update using (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members delete cards" on cards
  for delete using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Members read goals" on goals
  for select using (is_workspace_member(workspace_id));

create policy "Members write goals" on goals
  for insert with check (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members update goals" on goals
  for update using (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members delete goals" on goals
  for delete using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Members read debts" on debts
  for select using (is_workspace_member(workspace_id));

create policy "Members write debts" on debts
  for insert with check (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members update debts" on debts
  for update using (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members delete debts" on debts
  for delete using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Members read transactions" on transactions
  for select using (is_workspace_member(workspace_id));

create policy "Members write transactions" on transactions
  for insert with check (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members update transactions" on transactions
  for update using (workspace_role(workspace_id) in ('owner','admin','member'));

create policy "Members delete transactions" on transactions
  for delete using (workspace_role(workspace_id) in ('owner','admin'));

create policy "Members read attachments" on attachments
  for select using (exists(select 1 from transactions t where t.id = attachments.transaction_id and is_workspace_member(t.workspace_id)));

create policy "Members write attachments" on attachments
  for insert with check (exists(select 1 from transactions t where t.id = attachments.transaction_id and workspace_role(t.workspace_id) in ('owner','admin','member')));

create policy "Members read notifications" on notifications
  for select using (is_workspace_member(workspace_id));

create policy "Members update notifications" on notifications
  for update using (is_workspace_member(workspace_id));

create policy "Members read debt payments" on debt_payments
  for select using (exists(select 1 from debts d where d.id = debt_payments.debt_id and is_workspace_member(d.workspace_id)));

create policy "Members write debt payments" on debt_payments
  for insert with check (exists(select 1 from debts d where d.id = debt_payments.debt_id and workspace_role(d.workspace_id) in ('owner','admin','member')));

