import { supabase } from "../supabaseClient.js";
import { state } from "../state.js";

export async function listAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("workspace_id", state.activeWorkspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createAccount(payload) {
  const { data, error } = await supabase
    .from("accounts")
    .insert({ ...payload, workspace_id: state.activeWorkspaceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAccount(id, payload) {
  const { data, error } = await supabase
    .from("accounts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(id) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
