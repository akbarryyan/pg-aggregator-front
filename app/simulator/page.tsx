"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatIDR, StatusBadge } from "@/app/components/admin/ui";
import {
  fetchPublicPaymentByReference,
  simulatePublicPayment,
  type PublicPayment,
  type SimulationOutcome,
} from "@/lib/merchant-api";
import { decodeQrFromBlob, parseSandboxPayload } from "@/lib/sandbox-qr";

const PLACEHOLDER =
  "https://api.whuzpay.web.id/api/v1/public/payments/by-reference/.../qr.png";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SimulatorClient() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState(() => searchParams.get("qr") ?? "");
  const [payment, setPayment] = useState<PublicPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState<SimulationOutcome | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function resolveBlob(blob: Blob, loadError: string) {
    setScanning(true);
    setError(null);
    setNotice(null);
    setPayment(null);
    try {
      let text: string | null;
      try {
        text = await decodeQrFromBlob(blob);
      } catch {
        setError(loadError);
        return;
      }
      if (!text) {
        setError("No QR code found in this image.");
        return;
      }
      const reference = parseSandboxPayload(text);
      if (!reference) {
        setError("This is not a WhuzPay sandbox QR code.");
        return;
      }
      try {
        setPayment(await fetchPublicPaymentByReference(reference));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment not found.");
      }
    } finally {
      setScanning(false);
    }
  }

  async function scanUrl() {
    if (scanning) return;
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("bad protocol");
      }
    } catch {
      setPayment(null);
      setNotice(null);
      setError("Enter a valid image URL.");
      return;
    }
    let blob: Blob;
    try {
      setScanning(true);
      setError(null);
      setNotice(null);
      const res = await fetch(parsed.toString());
      if (!res.ok) throw new Error("bad status");
      blob = await res.blob();
    } catch {
      setScanning(false);
      setPayment(null);
      setNotice(null);
      setError("Could not load the image. Check the URL.");
      return;
    }
    await resolveBlob(blob, "Could not load the image. Check the URL.");
  }

  async function onFile(file: File | undefined) {
    if (!file || scanning) return;
    await resolveBlob(file, "Could not read the image file.");
  }

  async function simulate(outcome: SimulationOutcome) {
    if (!payment || running) return;
    setRunning(outcome);
    setError(null);
    setNotice(null);
    try {
      const next = await simulatePublicPayment(payment.reference, outcome);
      setPayment(next);
      setNotice(`Payment ${next.reference} is now ${next.status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setRunning(null);
    }
  }

  function reset() {
    setPayment(null);
    setError(null);
    setNotice(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const busy = scanning || running !== null;

  return (
    <main className="min-h-screen bg-[#eff4f8] px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-[560px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_rgba(16,38,73,0.10)]">
          <header className="bg-[#0c2a5b] px-4 py-5 sm:px-6">
            <h1 className="text-[18px] font-semibold text-white">QRIS Simulator</h1>
            <p className="mt-1 text-[12.5px] text-white/75">
              For WhuzPay sandbox payments only. No real money moves.
            </p>
          </header>

          <div className="space-y-5 px-4 py-5 sm:px-6">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void scanUrl();
              }}
            >
              <label className="block text-[13px] font-medium text-[#243b53]" htmlFor="qr-url">
                QR image URL
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="qr-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={PLACEHOLDER}
                  className="min-h-10 min-w-0 flex-1 rounded-md border border-[#d5dee8] px-3 text-[13px] text-[#102649] outline-none focus:border-[#0c2a5b]"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-10 rounded-md bg-[#0c2a5b] px-4 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {scanning ? "Scanning..." : "Scan QR"}
                </button>
              </div>
              <div>
                <label
                  className="mb-1 block text-[13px] font-medium text-[#243b53]"
                  htmlFor="qr-file"
                >
                  Upload QR image
                </label>
                <input
                  id="qr-file"
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => void onFile(e.target.files?.[0])}
                  className="block w-full min-w-0 text-[13px] text-[#52667a] file:mr-3 file:min-h-10 file:rounded-md file:border-0 file:bg-[#eef2f6] file:px-4 file:text-[13px] file:font-semibold file:text-[#243b53]"
                />
              </div>
            </form>

            {error ? (
              <p
                role="alert"
                className="rounded-md bg-[#fff1ed] px-3 py-2 text-[13px] break-words text-[#c2410c]"
              >
                {error}
              </p>
            ) : null}
            {notice ? (
              <p
                role="status"
                className="rounded-md bg-[#e8f8ee] px-3 py-2 text-[13px] break-words text-[#2f9e5a]"
              >
                {notice}
              </p>
            ) : null}

            {payment ? (
              <section className="space-y-4 rounded-xl border border-[#e8eef4] p-4">
                <dl className="space-y-3 text-[13px]">
                  <Row label="Merchant">
                    {payment.merchant_name?.trim() || "—"}
                  </Row>
                  <Row label="Total">
                    <span className="font-semibold">
                      {formatIDR(payment.total_amount, payment.currency)}
                    </span>
                  </Row>
                  <Row label="Reference">
                    <span className="font-mono text-[12px] break-all">{payment.reference}</span>
                  </Row>
                  <Row label="Status">
                    <StatusBadge status={payment.status} />
                  </Row>
                  <Row label="Expires at">{formatDateTime(payment.expires_at)}</Row>
                </dl>

                {payment.status === "pending" ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void simulate("paid")}
                      className="min-h-10 flex-1 rounded-md bg-[#2f9e5a] px-4 text-[13px] font-semibold text-white disabled:opacity-60"
                    >
                      {running === "paid" ? "Paying..." : "Pay"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void simulate("failed")}
                      className="min-h-10 flex-1 rounded-md border border-[#e85d3b] bg-white px-4 text-[13px] font-semibold text-[#e85d3b] disabled:opacity-60"
                    >
                      {running === "failed" ? "Failing..." : "Fail"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void simulate("expired")}
                      className="min-h-10 flex-1 rounded-md border border-[#9aa7b5] bg-white px-4 text-[13px] font-semibold text-[#52667a] disabled:opacity-60"
                    >
                      {running === "expired" ? "Expiring..." : "Expire"}
                    </button>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#6b7c93]">
                    This payment is no longer pending.
                  </p>
                )}
              </section>
            ) : null}

            {payment || error || notice ? (
              <button
                type="button"
                disabled={busy}
                onClick={reset}
                className="min-h-10 w-full rounded-md border border-[#d5dee8] bg-white px-4 text-[13px] font-semibold text-[#243b53] sm:w-auto disabled:opacity-60"
              >
                Scan another QR
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-[#8a97a8]">{label}</dt>
      <dd className="min-w-0 text-right break-words text-[#102649]">{children}</dd>
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense fallback={null}>
      <SimulatorClient />
    </Suspense>
  );
}
