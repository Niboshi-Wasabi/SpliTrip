import { OpenBetaBanner } from "@/components/beta/open-beta-banner";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <>
      <OpenBetaBanner />
      {children}
    </>
  );
}
