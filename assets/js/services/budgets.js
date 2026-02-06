import { supabase } from "../supabaseClient.js";
import { state } from "../state.js";

export async function listBudgets(month) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*, categories(name)")
    .eq("workspace_id", state.activeWorkspaceId)
    .eq("month", month);
  if (error) throw error;
  return data || [];
}

export async function upsertBudget(payload) {
  const { data, error } = await supabase
    .from("budgets")
    .upsert({ ...payload, workspace_id: state.activeWorkspaceId }, { onConflict: "workspace_id,category_id,month" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("workspace_id", state.activeWorkspaceId)
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function createCategory(payload) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...payload, workspace_id: state.activeWorkspaceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
