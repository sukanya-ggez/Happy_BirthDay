// Resolve links against Vite's base, including GitHub project Pages.
export function appUrl(relative = ""): string {
  return import.meta.env.BASE_URL + relative.replace(/^\/+/, "");
}

export function appRoute(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const pathname = location.pathname;
  if (base && pathname !== base && !pathname.startsWith(base + "/")) return "";
  return pathname.slice(base.length).replace(/^\/+|\/+$/g, "");
}
