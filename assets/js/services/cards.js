import { supabase } from "../supabaseClient.js";
import { state } from "../state.js";

export async function listCards() {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("workspace_id", state.activeWorkspaceId);
  if (error) throw error;
  return data || [];
}

export async function createCard(payload) {
  const { data, error } = await supabase
    .from("cards")
    .insert({ ...payload, workspace_id: state.activeWorkspaceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCard(id, payload) {
  const { data, error } = await supabase
    .from("cards")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createCardPurchase(payload) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...payload, workspace_id: state.activeWorkspaceId, type: "expense", is_paid: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCardPurchases(cardId, cycle) {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("workspace_id", state.activeWorkspaceId)
    .eq("card_id", cardId)
    .order("date", { ascending: false });
  if (cycle) query = query.eq("card_cycle", cycle);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function payCardInvoice(cardId, cycle) {
  const { data: unpaid, error: listErr } = await supabase
    .from("transactions")
    .select("id, amount, currency")
    .eq("workspace_id", state.activeWorkspaceId)
    .eq("card_id", cardId)
    .eq("card_cycle", cycle)
    .eq("is_paid", false);
  if (listErr) throw listErr;
  const total = (unpaid || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
  if (!total) return null;

  const { data: payment, error: payErr } = await supabase
    .from("transactions")
    .insert({
      workspace_id: state.activeWorkspaceId,
      type: "expense",
      amount: total,
      currency: unpaid[0]?.currency || "BRL",
      date: new Date().toISOString().slice(0, 10),
      description: `Pagamento de fatura ${cycle}`,
      card_id: cardId
    })
    .select()
    .single();
  if (payErr) throw payErr;

  const { error: updErr } = await supabase
    .from("transactions")
    .update({ is_paid: true, payment_transaction_id: payment.id })
    .eq("workspace_id", state.activeWorkspaceId)
    .eq("card_id", cardId)
    .eq("card_cycle", cycle)
    .eq("is_paid", false);
  if (updErr) throw updErr;

  return payment;
}

export async function generateInvoice(cardId, month, total) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      workspace_id: state.activeWorkspaceId,
      type: "expense",
      amount: total,
      currency: "BRL",
      date: `${month}-01`,
      description: "Pagamento de fatura",
      card_id: cardId
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
