/**
 * 特定商取引法に基づく表記ページ。
 * Specified Commercial Transactions Act page.
 */

import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal-page-shell";

type PageProps = { params: Promise<{ locale: string }> };

export default async function CommercePage({ params }: PageProps) {
  await params;
  const translations = await getTranslations("Commerce");

  const labelRows: string[] = translations.raw("labels");
  const valueRows: string[] = translations.raw("values");

  return (
    <LegalPageShell
      title={translations("pageTitle")}
      lastUpdated={translations("lastUpdated")}
      backLabel={translations("backTop")}
    >
      <p>{translations("intro")}</p>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("tableTitle")}
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--apple-separator)]">
          <table className="min-w-full border-collapse text-sm">
            <tbody>
              {labelRows.map((label, rowIndex) => (
                <tr key={label} className="border-t border-[var(--apple-separator)] first:border-t-0">
                  <th className="w-1/3 bg-[var(--apple-fill-tertiary)]/40 px-3 py-2 text-left font-medium text-[var(--apple-text)]">
                    {label}
                  </th>
                  <td className="px-3 py-2 text-[var(--apple-text)]/90">
                    {valueRows[rowIndex] ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </LegalPageShell>
  );
}
