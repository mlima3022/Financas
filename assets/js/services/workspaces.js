import { supabase } from "../supabaseClient.js";
import { state, setState } from "../state.js";

export async function fetchWorkspaces() {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id,name,created_at");
  if (error) throw error;
  setState({ workspaces: data || [] });
  if (!state.activeWorkspaceId && data?.length) {
    setState({ activeWorkspaceId: data[0].id });
  }
  return data;
}

export async function createWorkspace(name) {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  await fetchWorkspaces();
  return data;
}

export async function getWorkspaceRole(workspaceId) {
  const { data, error } = await supabase
    .rpc("workspace_role", { ws_id: workspaceId });
  if (error) throw error;
  return data;
}

export function setActiveWorkspace(id) {
  setState({ activeWorkspaceId: id });
}
