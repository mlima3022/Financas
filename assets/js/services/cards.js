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
