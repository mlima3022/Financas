import { supabase } from "../supabaseClient.js";
import { state } from "../state.js";

export async function listGoals() {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("workspace_id", state.activeWorkspaceId);
  if (error) throw error;
  return data || [];
}

export async function createGoal(payload) {
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...payload, workspace_id: state.activeWorkspaceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addContribution(id, amount) {
  const { data, error } = await supabase
    .rpc("add_goal_contribution", { goal_id: id, amount_value: amount });
  if (error) throw error;
  return data;
}
