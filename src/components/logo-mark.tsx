import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <span className={cn("text-2xl font-bold tracking-tight md:text-3xl", className)}>
      SpliTrip
    </span>
  );
}
