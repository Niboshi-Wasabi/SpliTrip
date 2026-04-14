import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LogoMark } from "@/components/logo-mark";

const STAT_CARD_COUNT = 3;
const MEMBER_SKELETON_COUNT = 4;

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className ?? ""}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <LogoMark className="text-lg md:text-lg" />
            <div>
              <Skeleton className="mb-1 h-5 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 grid items-stretch gap-4 sm:grid-cols-3">
          {[...Array(STAT_CARD_COUNT)].map((_, cardIndex) => (
            <Card key={cardIndex} className="flex h-full min-h-0 flex-col">
              <CardHeader className="shrink-0 pb-2">
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end pt-0">
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="mb-2 h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="flex h-[300px] items-center justify-center">
                <div className="h-[220px] w-[220px] animate-pulse rounded-full border-[30px] border-gray-200" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="mb-2 h-5 w-40" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(MEMBER_SKELETON_COUNT)].map((_, memberIndex) => (
                  <div key={memberIndex} className="flex items-center gap-3 rounded-lg border p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="mb-1 h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
