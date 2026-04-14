import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-2xl md:text-3xl",
        className,
      )}
    >
      <Image
        src="/icons/splitrip-logo.svg"
        alt="SpliTrip"
        width={563}
        height={194}
        className="h-[1em] w-auto"
        priority
      />
    </span>
  );
}
