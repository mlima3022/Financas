export const state = {
  user: null,
  session: null,
  workspaces: [],
  activeWorkspaceId: null,
  notifications: []
};

const listeners = new Set();

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
