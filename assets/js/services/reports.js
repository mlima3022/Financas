import { supabase } from "../supabaseClient.js";
import { state } from "../state.js";

export async function getDashboardSummary(month) {
  const { data, error } = await supabase
    .rpc("dashboard_summary", { ws_id: state.activeWorkspaceId, month_value: month });
  if (error) throw error;
  return data;
}

export async function getCategorySpend(month) {
  const { data, error } = await supabase
    .rpc("category_spend", { ws_id: state.activeWorkspaceId, month_value: month });
  if (error) throw error;
  return data || [];
}

export async function getMonthlyTrend(year) {
  const { data, error } = await supabase
    .rpc("monthly_trend", { ws_id: state.activeWorkspaceId, year_value: year });
  if (error) throw error;
  return data || [];
}

export async function exportReport({ from, to }) {
  const { data, error } = await supabase
    .from("transactions")
    .select("date,type,amount,currency,description")
    .eq("workspace_id", state.activeWorkspaceId)
    .gte("date", from)
    .lte("date", to)
    .order("date");
  if (error) throw error;
  return data || [];
}
