"use client";

import { useSidebar } from "@/lib/use-sidebar";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { collapsed, mobileOpen, expanded, toggle, closeMobile } = useSidebar();

  return (
    <div className="admin-root flex min-h-screen bg-[#eff4f8] text-[#1f2a37]">
      <AdminSidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={closeMobile} />
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#06163a]/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader expanded={expanded} onMenuClick={toggle} />
        <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
