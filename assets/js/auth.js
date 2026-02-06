import { supabase } from "./supabaseClient.js";

export async function login(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signup(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
}

export async function logout() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
