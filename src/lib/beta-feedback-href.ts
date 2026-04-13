/** オープンベータの不具合報告先（環境変数で上書き可）。 */
export const BETA_FEEDBACK_HREF =
  typeof process.env.NEXT_PUBLIC_OPEN_BETA_FEEDBACK_URL === "string" &&
  process.env.NEXT_PUBLIC_OPEN_BETA_FEEDBACK_URL.length > 0
    ? process.env.NEXT_PUBLIC_OPEN_BETA_FEEDBACK_URL
    : "https://github.com/Niboshi-Wasabi/SpliTrip/issues";
