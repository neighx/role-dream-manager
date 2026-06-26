import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { QuickCaptureFAB } from "@/components/quick-capture/QuickCaptureFAB";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ivory flex flex-col max-w-md mx-auto relative">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNavigation />
      <QuickCaptureFAB />
    </div>
  );
}
