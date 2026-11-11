"use client";

import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  LockIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { formatIDR } from "@/app/components/admin/ui";
import type { PublicPayment } from "@/lib/merchant-api";

// ---------------------------------------------------------------- helpers

export function formatDateTimeID(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function copyText(text: string, okMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
  } catch {
    toast.error("Tidak dapat menyalin.");
  }
}

// The QR comes from the provider's domain, so a plain download link would be
// blocked by the browser. Try to fetch it as a file; if that fails, open the
// image in a new tab and tell the customer how to save it.
async function saveQrImage(url: string, reference: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("download failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `qris-${reference}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    toast("Tahan gambar QR lalu pilih “Simpan gambar”.", { duration: 6000 });
  }
}

// -------------------------------------------------------------- summary

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-[13px]">
      <dt className="shrink-0 text-[#6b7c93]">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-[#1f2a37]">
        {children}
      </dd>
    </div>
  );
}

/** Price breakdown + order id. Used on desktop (left column) and in the mobile
 *  "Lihat rincian pesanan" disclosure. */
export function OrderDetails({ payment }: { payment: PublicPayment }) {
  const hasFee = payment.fee_amount > 0;
  return (
    <div className="space-y-4">
      <dl className="space-y-2.5">
        {payment.merchant_name ? (
          <SummaryRow label="Dibayarkan kepada">{payment.merchant_name}</SummaryRow>
        ) : null}
        {payment.description ? (
          <SummaryRow label="Deskripsi">{payment.description}</SummaryRow>
        ) : null}
        <SummaryRow label="Order ID">
          <span className="inline-flex items-center justify-end gap-1.5">
            <span className="break-all font-mono text-[12px]">
              {payment.reference}
            </span>
            <button
              type="button"
              aria-label="Salin Order ID"
              onClick={() => void copyText(payment.reference, "Order ID disalin.")}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#6b7c93] transition hover:bg-[#eef2f6] hover:text-[#06163a]"
            >
              <CopyIcon className="size-4" />
            </button>
          </span>
        </SummaryRow>
      </dl>
      <dl className="space-y-2 border-t border-[#e8eef4] pt-4">
        <SummaryRow label="Harga">
          {formatIDR(payment.amount, payment.currency)}
        </SummaryRow>
        {hasFee ? (
          <SummaryRow label="Biaya layanan">
            {formatIDR(payment.fee_amount, payment.currency)}
          </SummaryRow>
        ) : null}
        <div className="flex items-center justify-between gap-4 border-t border-[#e8eef4] pt-3">
          <dt className="text-[13px] font-semibold text-[#1f2a37]">Total bayar</dt>
          <dd className="text-[18px] font-bold tracking-tight text-[#1f2a37]">
            {formatIDR(payment.total_amount, payment.currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Merchant + total strip shown at the top on small screens. */
export function MobileTotal({ payment }: { payment: PublicPayment }) {
  return (
    <div className="border-b border-[#e8eef4] bg-[#fafbfc] px-5 py-4 md:hidden">
      {payment.merchant_name ? (
        <p className="text-[12px] text-[#6b7c93]">
          Dibayarkan kepada{" "}
          <span className="font-semibold text-[#1f2a37]">
            {payment.merchant_name}
          </span>
        </p>
      ) : null}
      <p className="mt-1 text-[12px] text-[#6b7c93]">Total bayar</p>
      <p className="text-[26px] font-bold leading-tight tracking-tight text-[#1f2a37]">
        {formatIDR(payment.total_amount, payment.currency)}
      </p>
    </div>
  );
}

// ------------------------------------------------------------ QRIS panel

const APPS = [
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "LinkAja",
  "BCA mobile",
  "Livin’ by Mandiri",
  "BNI Mobile",
  "BRI Mobile",
];

const STEPS = [
  "Buka aplikasi e-wallet atau mobile banking Anda.",
  "Pilih menu Bayar / Scan QR, lalu pindai kode QR di atas.",
  "Periksa nominal dan nama penerima, lalu konfirmasi pembayaran.",
];

export function QrisPanel({
  payment,
  remainingLabel,
  progress,
}: {
  payment: PublicPayment;
  /** "28:41", or null while the clock has not started. */
  remainingLabel: string | null;
  /** 0..1 share of the payment window that is left. */
  progress: number;
}) {
  const isImageQr =
    payment.qris_data?.startsWith("data:image") ||
    payment.qris_data?.startsWith("http");
  const expiredLocally = remainingLabel === "Habis";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[17px] font-semibold text-[#1f2a37]">
          Bayar dengan QRIS
        </h2>
        <p className="mt-1 text-[13px] text-[#6b7c93]">
          Pindai kode QR di bawah dengan aplikasi e-wallet atau mobile banking
          Anda.
        </p>
      </div>

      <div className="rounded-2xl border border-[#e8eef4] bg-white p-4 text-center">
        {payment.qris_data ? (
          isImageQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={payment.qris_data}
              alt="Kode QR QRIS"
              className="mx-auto aspect-square w-full max-w-65 rounded-lg object-contain"
            />
          ) : (
            <pre className="max-h-40 overflow-auto break-all text-left text-[11px] text-[#3d4b5c]">
              {payment.qris_data}
            </pre>
          )
        ) : (
          <p className="py-10 text-[13px] text-[#8a97a8]">
            Kode QR belum tersedia.
          </p>
        )}

        {remainingLabel ? (
          <div className="mt-4">
            <p className="flex items-center justify-center gap-1.5 text-[13px] text-[#6b7c93]">
              <ClockIcon className="size-4" aria-hidden="true" />
              {expiredLocally ? (
                <span className="font-semibold text-[#e85d3b]">
                  Waktu pembayaran habis
                </span>
              ) : (
                <>
                  Selesaikan pembayaran dalam{" "}
                  <span className="font-semibold tabular-nums text-[#1f2a37]">
                    {remainingLabel}
                  </span>
                </>
              )}
            </p>
            <div
              className="mx-auto mt-2 h-1.5 w-full max-w-65 overflow-hidden rounded-full bg-[#eef2f6]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label="Sisa waktu pembayaran"
            >
              <div
                className="h-full rounded-full bg-[#ff5e16] transition-[width] duration-1000 ease-linear"
                style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        {isImageQr ? (
          <button
            type="button"
            onClick={() => void saveQrImage(payment.qris_data as string, payment.reference)}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#e8eef4] bg-white px-5 text-[13px] font-semibold text-[#3d4b5c] transition hover:bg-[#f4f7fb]"
          >
            <DownloadIcon className="size-4" aria-hidden="true" />
            Simpan QR
          </button>
        ) : null}
      </div>

      <p className="text-center text-[12px] text-[#8a97a8]" role="status">
        Status diperbarui otomatis. Jangan tutup halaman ini setelah membayar.
      </p>

      <div>
        <h3 className="text-[13px] font-semibold text-[#1f2a37]">Cara membayar</h3>
        <ol className="mt-2 space-y-2">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-[13px] text-[#3d4b5c]">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#fff3ec] text-[12px] font-semibold text-[#ff5e16]">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-[#1f2a37]">
          Aplikasi yang didukung
        </h3>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {APPS.map((app) => (
            <li
              key={app}
              className="rounded-full border border-[#e8eef4] bg-[#fafbfc] px-3 py-1 text-[12px] text-[#3d4b5c]"
            >
              {app}
            </li>
          ))}
          <li className="rounded-full px-1 py-1 text-[12px] text-[#8a97a8]">
            dan semua aplikasi yang mendukung QRIS
          </li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------- result panels

function ResultFrame({
  tone,
  icon,
  title,
  children,
}: {
  tone: "success" | "danger" | "neutral";
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const toneClass = {
    success: "bg-[#e8f8ee] text-[#2f9e5a]",
    danger: "bg-[#fff1ed] text-[#e85d3b]",
    neutral: "bg-[#eef2f6] text-[#6b7c93]",
  }[tone];
  return (
    <div className="flex flex-col items-center py-6 text-center" role="status">
      <span
        className={`flex size-16 items-center justify-center rounded-full ${toneClass}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h2 className="mt-4 text-[20px] font-semibold text-[#1f2a37]">{title}</h2>
      <div className="mt-2 w-full max-w-sm text-[13px] text-[#6b7c93]">{children}</div>
    </div>
  );
}

function ResultRows({ payment, paidAt }: { payment: PublicPayment; paidAt?: boolean }) {
  return (
    <dl className="mt-5 space-y-2.5 rounded-xl border border-[#e8eef4] bg-[#fafbfc] px-4 py-3 text-left">
      <SummaryRow label="Total">
        {formatIDR(payment.total_amount, payment.currency)}
      </SummaryRow>
      {paidAt ? (
        <SummaryRow label="Dibayar pada">{formatDateTimeID(payment.paid_at)}</SummaryRow>
      ) : null}
      <SummaryRow label="Order ID">
        <span className="break-all font-mono text-[12px]">{payment.reference}</span>
      </SummaryRow>
    </dl>
  );
}

/** Final-state screens. Returns null for a payment that is still pending. */
export function ResultPanel({ payment }: { payment: PublicPayment }) {
  switch (payment.status) {
    case "paid":
      return (
        <ResultFrame
          tone="success"
          icon={<CheckCircle2Icon className="size-9" />}
          title="Pembayaran berhasil"
        >
          <p>Terima kasih. Pembayaran Anda sudah kami terima.</p>
          <ResultRows payment={payment} paidAt />
          <p className="mt-4 text-[12px] text-[#8a97a8]">
            Anda dapat menutup halaman ini.
          </p>
        </ResultFrame>
      );
    case "expired":
      return (
        <ResultFrame
          tone="danger"
          icon={<ClockIcon className="size-9" />}
          title="Waktu pembayaran habis"
        >
          <p>
            Kode QR ini sudah tidak berlaku. Jangan melakukan pembayaran dengan
            kode ini. Hubungi merchant untuk mendapatkan tautan pembayaran baru.
          </p>
          <ResultRows payment={payment} />
        </ResultFrame>
      );
    case "failed":
    case "cancelled":
      return (
        <ResultFrame
          tone="danger"
          icon={<XCircleIcon className="size-9" />}
          title={payment.status === "failed" ? "Pembayaran gagal" : "Pembayaran dibatalkan"}
        >
          <p>
            Pembayaran ini tidak dapat diselesaikan. Hubungi merchant bila Anda
            sudah melakukan pembayaran atau memerlukan tautan baru.
          </p>
          <ResultRows payment={payment} />
        </ResultFrame>
      );
    case "refunded":
      return (
        <ResultFrame
          tone="neutral"
          icon={<RotateCcwIcon className="size-8" />}
          title="Pembayaran dikembalikan"
        >
          <p>
            Dana pembayaran ini telah dikembalikan oleh merchant. Hubungi
            merchant bila ada pertanyaan.
          </p>
          <ResultRows payment={payment} paidAt />
        </ResultFrame>
      );
    default:
      return null;
  }
}

// ------------------------------------------------------------ page shell

export function CheckoutHeader({ sandbox }: { sandbox: boolean }) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
      <p className="text-[15px] font-semibold tracking-tight text-[#06163a]">
        whuzpay
        <span className="text-[#ff5e16]">.</span>
      </p>
      <div className="flex items-center gap-2">
        {sandbox ? (
          <span className="rounded-full bg-[#fff7e6] px-2.5 py-1 text-[11px] font-semibold text-[#c27a00]">
            Mode sandbox · bukan uang sungguhan
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6b7c93]">
          <LockIcon className="size-3.5" aria-hidden="true" />
          Pembayaran aman
        </span>
      </div>
    </header>
  );
}

/** Mobile-only disclosure with the order details under the QR panel. */
export function MobileDetails({ payment }: { payment: PublicPayment }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-[#e8eef4] md:hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between px-5 text-[13px] font-semibold text-[#1f2a37]"
      >
        Lihat rincian pesanan
        <span aria-hidden="true" className="text-[#6b7c93]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="px-5 pb-5">
          <OrderDetails payment={payment} />
        </div>
      ) : null}
    </div>
  );
}
