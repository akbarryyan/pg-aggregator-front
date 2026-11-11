"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchPublicPaymentByReference,
  type PublicPayment,
} from "@/lib/merchant-api";
import {
  CheckoutHeader,
  MobileDetails,
  MobileTotal,
  OrderDetails,
  QrisPanel,
  ResultPanel,
} from "./CheckoutPanels";

const POLL_MS = 5000;

export default function PublicPayPage() {
  const params = useParams<{ reference: string }>();
  const reference = params?.reference ? decodeURIComponent(params.reference) : "";
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // Poll while the payment is pending; stop once it reaches a final status.
  const pending = payment === null || payment.status === "pending";
  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchPublicPaymentByReference(reference);
        if (!cancelled) {
          setPayment(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Pembayaran tidak ditemukan.");
          setPayment(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    if (!pending) {
      return () => {
        cancelled = true;
      };
    }
    const interval = window.setInterval(() => {
      if (!cancelled) void load();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [reference, pending]);

  // One-second clock for the countdown, only while there is something to count.
  const counting = payment?.status === "pending";
  useEffect(() => {
    if (!counting) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [counting]);

  const countdown = (() => {
    if (!payment || payment.status !== "pending") return null;
    const end = new Date(payment.expires_at).getTime();
    const start = new Date(payment.created_at).getTime();
    if (Number.isNaN(end)) return null;
    const ms = end - now;
    const total = Number.isNaN(start) ? 0 : end - start;
    const progress = total > 0 ? Math.max(0, Math.min(1, ms / total)) : 0;
    if (ms <= 0) return { label: "Habis", progress: 0 };
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return { label: `${m}:${String(s).padStart(2, "0")}`, progress };
  })();

  const isFinal = payment !== null && payment.status !== "pending";

  return (
    <main className="min-h-screen bg-[#eff4f8] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <CheckoutHeader sandbox={payment?.environment === "sandbox"} />

        <div className="overflow-hidden rounded-2xl border border-[#e8eef4] bg-white shadow-[0_16px_48px_rgba(16,38,73,0.08)]">
          {loading && !payment ? (
            <p className="px-5 py-16 text-center text-[13px] text-[#8a97a8]" role="status">
              Memuat pembayaran...
            </p>
          ) : error || !payment ? (
            <div className="px-5 py-16 text-center">
              <h1 className="text-[18px] font-semibold text-[#1f2a37]">
                Pembayaran tidak ditemukan
              </h1>
              <p className="mt-2 text-[13px] text-[#6b7c93]">
                {error ?? "Periksa kembali tautan pembayaran Anda."}
              </p>
            </div>
          ) : (
            <>
              <MobileTotal payment={payment} />
              <div className="md:grid md:grid-cols-5">
                <aside className="hidden border-r border-[#e8eef4] bg-[#fafbfc] p-6 md:col-span-2 md:block">
                  <h2 className="mb-4 text-[15px] font-semibold text-[#1f2a37]">
                    Ringkasan pesanan
                  </h2>
                  <OrderDetails payment={payment} />
                </aside>
                <section className="p-5 sm:p-6 md:col-span-3">
                  {isFinal ? (
                    <ResultPanel payment={payment} />
                  ) : (
                    <QrisPanel
                      payment={payment}
                      remainingLabel={countdown?.label ?? null}
                      progress={countdown?.progress ?? 0}
                    />
                  )}
                </section>
              </div>
              <MobileDetails payment={payment} />
            </>
          )}
        </div>

        <p className="mt-4 px-1 text-center text-[11.5px] text-[#8a97a8]">
          Didukung oleh whuzpay · Jangan membagikan halaman ini kepada siapa pun.
        </p>
      </div>
    </main>
  );
}
