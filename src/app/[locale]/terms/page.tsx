/**
 * 利用規約ページ。i18n 辞書から本文を読み込み静的にレンダリングする。
 * Terms of Service page. Renders content from i18n dictionaries as a static page.
 */

import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal-page-shell";

type PageProps = { params: Promise<{ locale: string }> };

export default async function TermsPage({ params }: PageProps) {
  await params;
  const translations = await getTranslations("Terms");

  const prohibitedItems: string[] = translations.raw("s3Items");

  return (
    <LegalPageShell
      title={translations("pageTitle")}
      lastUpdated={translations("lastUpdated")}
      backLabel={translations("backTop")}
    >
      <p>{translations("intro")}</p>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s1Title")}
        </h2>
        <p className="mt-2">{translations("s1Body")}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s2Title")}
        </h2>
        <p className="mt-2">{translations("s2Body")}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s3Title")}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          {prohibitedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s4Title")}
        </h2>
        <p className="mt-2">{translations("s4Body")}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s5Title")}
        </h2>
        <p className="mt-2">{translations("s5Body")}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s6Title")}
        </h2>
        <p className="mt-2">{translations("s6Body")}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s7Title")}
        </h2>
        <p className="mt-2">{translations("s7Body")}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s8Title")}
        </h2>
        <p className="mt-2">{translations("s8Body")}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s9Title")}
        </h2>
        <p className="mt-2">{translations("s9Body")}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[var(--apple-text)]">
          {translations("s10Title")}
        </h2>
        <p className="mt-2">{translations("s10Body")}</p>
      </section>
    </LegalPageShell>
  );
}
