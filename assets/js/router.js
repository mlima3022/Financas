import { qs, qsa } from "./utils.js";

const routes = new Map();

export function registerRoute(path, handler, title = "") {
  routes.set(path, { handler, title });
}

export function startRouter() {
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

export function navigate(path) {
  window.location.hash = path;
}

function renderRoute() {
  const hash = window.location.hash || "#/login";
  const path = hash.split("?")[0];
  const route = routes.get(path) || routes.get("#/404");
  if (!route) return;

  const titleEl = qs("#pageTitle");
  if (titleEl && route.title) titleEl.textContent = route.title;

  qsa("[data-route]").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === path);
  });

  route.handler();
}
