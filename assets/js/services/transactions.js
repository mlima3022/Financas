import { supabase } from "../supabaseClient.js";
import { state } from "../state.js";

export async function listTransactions({ from, to, accountId, categoryId, limit = 20, offset = 0 } = {}) {
  let query = supabase
    .from("transactions")
    .select("*, accounts:accounts!transactions_account_id_fkey(name), categories(name)")
    .eq("workspace_id", state.activeWorkspaceId)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (accountId) query = query.eq("account_id", accountId);
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createTransaction(payload) {
  const cleaned = { ...payload };
  const uuidFields = [
    "account_id",
    "transfer_account_id",
    "category_id",
    "card_id",
    "debt_id",
    "goal_id",
    "payment_transaction_id"
  ];
  uuidFields.forEach((key) => {
    if (cleaned[key] === "" || cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...cleaned, workspace_id: state.activeWorkspaceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id, payload) {
  const { data, error } = await supabase
    .from("transactions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadAttachment(file, transactionId) {
  const path = `${state.activeWorkspaceId}/${transactionId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("attachments").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data, error: metaErr } = await supabase
    .from("attachments")
    .insert({ transaction_id: transactionId, path, filename: file.name, size: file.size, mime: file.type })
    .select()
    .single();
  if (metaErr) throw metaErr;
  return data;
}
