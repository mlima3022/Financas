import { supabase } from "../supabaseClient.js";
import { state, setState } from "../state.js";

export async function listNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", state.activeWorkspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  setState({ notifications: data || [] });
  return data || [];
}

export async function markAsRead(id) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await listNotifications();
  return data;
}

export async function createNotification(payload) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({ ...payload, workspace_id: state.activeWorkspaceId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
