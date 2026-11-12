"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  fetchPublicPaymentByReference,
  type PublicPayment,
} from "@/lib/merchant-api";
import {
  CheckoutFooter,
  CheckoutHeader,
  QrisPanel,
  ResultPanel,
  SummaryCard,
} from "./CheckoutPanels";

const POLL_MS = 5000;

export default function PublicPayPage() {
  const params = useParams<{ reference: string }>();
  const reference = params?.reference ? decodeURIComponent(params.reference) : "";
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
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

  // "Saya sudah bayar": check right away instead of waiting for the next poll.
  async function checkNow() {
    if (!reference || checking) return;
    setChecking(true);
    try {
      const data = await fetchPublicPaymentByReference(reference);
      setPayment(data);
      setError(null);
      if (data.status === "pending") {
        toast("Pembayaran belum kami terima. Jika sudah membayar, tunggu beberapa saat lalu coba lagi.", {
          duration: 6000,
        });
      }
    } catch {
      toast.error("Gagal memeriksa status pembayaran. Coba lagi.");
    } finally {
      setChecking(false);
    }
  }

  const remainingLabel = (() => {
    if (!payment || payment.status !== "pending") return null;
    const end = new Date(payment.expires_at).getTime();
    if (Number.isNaN(end)) return null;
    const ms = end - now;
    if (ms <= 0) return "Habis";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  })();

  const isFinal = payment !== null && payment.status !== "pending";
  const sandbox = payment?.environment === "sandbox";

  return (
    <main className="min-h-screen bg-[#eff4f8] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_rgba(16,38,73,0.10)]">
          <CheckoutHeader merchantName={payment?.merchant_name} sandbox={sandbox} />

          <div className="px-4 pb-5">
            {loading && !payment ? (
              <div className="relative -mt-12 rounded-xl border border-[#e8eef4] bg-white px-4 py-12 text-center shadow-[0_6px_20px_rgba(16,38,73,0.10)]">
                <p className="text-[13px] text-[#8a97a8]" role="status">
                  Memuat pembayaran...
                </p>
              </div>
            ) : error || !payment ? (
              <div className="relative -mt-12 rounded-xl border border-[#e8eef4] bg-white px-4 py-12 text-center shadow-[0_6px_20px_rgba(16,38,73,0.10)]">
                <h1 className="text-[17px] font-semibold text-[#1f2a37]">
                  Pembayaran tidak ditemukan
                </h1>
                <p className="mt-2 text-[13px] text-[#6b7c93]">
                  {error ?? "Periksa kembali tautan pembayaran Anda."}
                </p>
              </div>
            ) : (
              <>
                <SummaryCard payment={payment} remainingLabel={remainingLabel} />
                <section className="mt-5">
                  {isFinal ? (
                    <ResultPanel payment={payment} />
                  ) : (
                    <QrisPanel payment={payment} checking={checking} onCheck={() => void checkNow()} />
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        <CheckoutFooter sandbox={sandbox} />
      </div>
    </main>
  );
}
