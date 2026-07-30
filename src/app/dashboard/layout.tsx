import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { AmbientLightBackground } from "@/components/layout/ambient-light-background";
import { AuthGate } from "@/features/auth/components/auth-gate";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="workspace-theme relative isolate min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <AmbientLightBackground variant="workspace" />
      <AuthGate>
        <DashboardSidebar />
        <div className="relative z-10 md:pl-56">
          <DashboardHeader />
          <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8 xl:px-10">{children}</main>
        </div>
      </AuthGate>
    </div>
  );
}
