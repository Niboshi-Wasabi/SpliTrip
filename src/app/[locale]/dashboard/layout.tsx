import { WhatsNewModal } from "@/components/ui/WhatsNewModal";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <>
      {children}
      <WhatsNewModal />
    </>
  );
}
