import type { Gift } from "../../shared/model";

// Read through the same authenticated API as the initial page load.
// Polling never grants public database access or downloads draft content.
export function watchPublished(
  read: () => Promise<Gift>,
  changed: (gift: Gift) => void,
  locked: () => void,
) {
  let stopped = false, inFlight = false;
  const check = async () => {
    if (stopped || inFlight || document.visibilityState === "hidden") return;
    inFlight = true;
    try {
      const gift = await read();
      if (!stopped) changed(gift);
    } catch (e) {
      if (!stopped && e instanceof Error && "status" in e && e.status === 401) locked();
      // Temporary network failures leave the current view intact and retry later.
    } finally { inFlight = false; }
  };
  const id = setInterval(() => void check(), 5000);
  const onVisible = () => void check();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  return () => {
    stopped = true;
    clearInterval(id);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
  };
}
