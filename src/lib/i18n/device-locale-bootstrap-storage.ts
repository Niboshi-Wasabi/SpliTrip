/**
 * Once device-vs-URL alignment or explicit user pick runs, skip auto device redirect.
 * 初回デバイス合わせまたはユーザー明示選択後は自動リダイレクトしない。
 */

export const SPLITRIP_LOCALE_BOOTSTRAP_DONE_STORAGE_KEY =
  "splitrip_locale_bootstrap_done";

export function markLocaleBootstrapComplete(): void {
  try {
    localStorage.setItem(SPLITRIP_LOCALE_BOOTSTRAP_DONE_STORAGE_KEY, "1");
  } catch {
    /* private / blocked storage */
  }
  try {
    sessionStorage.setItem(SPLITRIP_LOCALE_BOOTSTRAP_DONE_STORAGE_KEY, "1");
  } catch {
    /* private / blocked storage */
  }
}

export function markLocaleChosenByUser(): void {
  markLocaleBootstrapComplete();
}

export function hasLocaleBootstrapCompleted(): boolean {
  try {
    if (
      localStorage.getItem(SPLITRIP_LOCALE_BOOTSTRAP_DONE_STORAGE_KEY) === "1"
    ) {
      return true;
    }
  } catch {
    /* continue */
  }
  try {
    return (
      sessionStorage.getItem(SPLITRIP_LOCALE_BOOTSTRAP_DONE_STORAGE_KEY) ===
      "1"
    );
  } catch {
    return false;
  }
}
