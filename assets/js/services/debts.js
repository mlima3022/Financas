import { supabase } from "../supabaseClient.js";
import { state } from "../state.js";

export async function listDebts() {
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .eq("workspace_id", state.activeWorkspaceId);
  if (error) throw error;
  return data || [];
}

export async function createDebt(payload) {
  const { data, error } = await supabase
    .from("debts")
    .insert({ ...payload, workspace_id: state.activeWorkspaceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function payDebt(debtId, amount) {
  const { data, error } = await supabase
    .rpc("add_debt_payment", { debt_id: debtId, amount_value: amount });
  if (error) throw error;
  return data;
}
