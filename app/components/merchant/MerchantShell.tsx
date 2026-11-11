"use client";

import { useSidebar } from "@/lib/use-sidebar";
import MerchantHeader from "./MerchantHeader";
import MerchantSidebar from "./MerchantSidebar";

export default function MerchantShell({ children }: { children: React.ReactNode }) {
  const { collapsed, mobileOpen, expanded, toggle, closeMobile } = useSidebar();

  return (
    <div className="admin-root flex min-h-screen bg-[#eff4f8] text-[#1f2a37]">
      <MerchantSidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={closeMobile} />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#06163a]/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <MerchantHeader expanded={expanded} onMenuClick={toggle} />
        <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
