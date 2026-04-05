import { redirect } from "@/i18n/navigation";

type PageProps = { params: Promise<{ locale: string; id: string }> };

/** Public URL alias from invite emails: forwards to the authenticated dashboard route. */
export default async function GroupPublicAliasPage({ params }: PageProps) {
  const { locale, id } = await params;
  redirect({ href: `/dashboard/groups/${id}`, locale });
}
