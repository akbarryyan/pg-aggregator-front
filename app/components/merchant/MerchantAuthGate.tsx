"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getMerchantToken,
  setMerchantAuthNotice,
  setMerchantRedirectPath,
} from "@/lib/merchant-auth";

export default function MerchantAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getMerchantToken();
    if (!token) {
      setMerchantRedirectPath(pathname || "/dashboard");
      setMerchantAuthNotice("required");
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="admin-root flex min-h-screen items-center justify-center bg-[#eff4f8] text-[13px] text-[#8a97a8]">
        Checking session...
      </div>
    );
  }

  return <>{children}</>;
}
