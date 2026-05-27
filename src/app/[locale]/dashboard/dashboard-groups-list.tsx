import { UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatYen } from "@/lib/format";
import { PromoBanner } from "@/components/ads/PromoBanner";
import { ReceiptInboxDashboardTools } from "@/components/receipt-inbox/receipt-inbox-dashboard-tools";

type GroupEntry = {
  id: string;
  name: string;
  currencyCode: string;
  totalExpense: number;
};

type DashboardGroupsListProps = {
  groups: GroupEntry[];
  currentUserId: string;
  hasPremium: boolean;
  locale: string;
  labels: {
    title: string;
    description: string;
    createButton: string;
    empty: string;
  };
};

export function DashboardGroupsList({
  groups,
  currentUserId,
  hasPremium,
  locale,
  labels,
}: DashboardGroupsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersRound className="size-4" />
            {labels.title}
          </CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {groups.length > 0 ? (
          <ul className="space-y-2">
            {groups.map((groupItem) => (
              <li key={groupItem.id}>
                <Link
                  href={`/dashboard/groups/${groupItem.id}`}
                  className="flex min-h-[44px] items-center justify-between rounded-xl border border-[var(--apple-separator)] p-3 transition-colors hover:bg-[var(--apple-fill-tertiary)]"
                >
                  <div>
                    <span className="font-medium text-[var(--apple-link)]">
                      {groupItem.name}
                    </span>
                    <span className="ml-2 text-xs text-[var(--apple-text-secondary)]">
                      {groupItem.currencyCode}
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatYen(groupItem.totalExpense)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-sm text-[var(--apple-text-secondary)]">
            {labels.empty}
          </p>
        )}
        <div className="mt-4">
          <Link
            href="/dashboard/groups/new"
            className={cn(buttonVariants(), "w-full min-h-[44px] md:min-h-0")}
          >
            {labels.createButton}
          </Link>
        </div>
        <div className="mt-4">
          <ReceiptInboxDashboardTools
            currentUserId={currentUserId}
            groups={groups.map((groupItem) => ({
              id: groupItem.id,
              name: groupItem.name,
            }))}
          />
        </div>
        <div className="mt-4">
          <PromoBanner hidden={hasPremium} locale={locale} />
        </div>
      </CardContent>
    </Card>
  );
}
