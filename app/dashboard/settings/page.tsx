"use client";

import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import {
  fetchMerchantBusiness,
  updateMerchantBusiness,
  type MerchantBusiness,
} from "@/lib/merchant-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  LoadingBlock,
  PageHeader,
} from "../../components/admin/ui";

export default function MerchantSettingsPage() {
  const [business, setBusiness] = useState<MerchantBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [webhookURL, setWebhookURL] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchMerchantBusiness();
        if (cancelled) return;
        setBusiness(data);
        setName(data.name ?? "");
        setBusinessName(data.business_name ?? "");
        setPhone(data.phone ?? "");
        setWebhookURL(data.webhook_url ?? "");
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load settings.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateMerchantBusiness({
        name: name.trim(),
        business_name: businessName.trim(),
        phone: phone.trim(),
        webhook_url: webhookURL.trim() || null,
      });
      setBusiness(updated);
      toast.success("Business settings saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Settings"
        description="Business profile and merchant webhook URL for payment notifications."
      />

      {loading ? (
        <Card>
          <LoadingBlock />
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Contact name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-lg border border-[#e8eef4] px-3 text-[13px] outline-none focus:border-[#3b9eff] focus:ring-2 focus:ring-[#3b9eff]/15"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Business name
                </span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-10 rounded-lg border border-[#e8eef4] px-3 text-[13px] outline-none focus:border-[#3b9eff] focus:ring-2 focus:ring-[#3b9eff]/15"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Phone
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 rounded-lg border border-[#e8eef4] px-3 text-[13px] outline-none focus:border-[#3b9eff] focus:ring-2 focus:ring-[#3b9eff]/15"
                />
              </label>
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  Webhook URL
                </span>
                <input
                  value={webhookURL}
                  onChange={(e) => setWebhookURL(e.target.value)}
                  placeholder="https://your-store.com/webhooks/payments"
                  className="h-10 rounded-lg border border-[#e8eef4] px-3 text-[13px] outline-none focus:border-[#3b9eff] focus:ring-2 focus:ring-[#3b9eff]/15"
                />
              </label>
            </div>
            {business && (
              <p className="text-[12.5px] text-[#8a97a8]">
                Login email (account):{" "}
                <span className="font-medium text-[#3d4b5c]">
                  {business.email}
                </span>
              </p>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="h-10 rounded-full bg-[#06163a] px-5 text-[13px] font-semibold text-white shadow-none hover:bg-[#0b2048]"
            >
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
