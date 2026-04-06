import type { SplitMode } from "@/lib/group-expense-split-server";
import type { ExpenseSplitModeDb } from "@/lib/database.types";

/**
 * Maps client/API split modes to DB enum values on `group_expenses.split_type`.
 * アプリの split モードを DB の expense_split_mode に対応づける。
 */
export function mapSplitModeToDatabaseEnum(
  splitMode: SplitMode,
): ExpenseSplitModeDb {
  switch (splitMode) {
    case "equal":
      return "EQUAL";
    case "exact":
      return "EXACT";
    case "percent":
      return "PERCENTAGE";
    case "shares":
      return "SHARES";
    case "itemized":
      return "ITEMIZED";
    default:
      return "EQUAL";
  }
}
