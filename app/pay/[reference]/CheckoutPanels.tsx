"use client";

import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleHelpIcon,
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

/** White card overlapping the navy header: total, countdown, order id, and a
 *  chevron that reveals the full price breakdown. */
export function SummaryCard({
  payment,
  remainingLabel,
}: {
  payment: PublicPayment;
  /** "59:32", "Habis", or null when no countdown applies (final states). */
  remainingLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  const expired = remainingLabel === "Habis";
  return (
    <div className="relative -mt-12 rounded-xl border border-[#e8eef4] bg-white shadow-[0_6px_20px_rgba(16,38,73,0.10)]">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Sembunyikan rincian pesanan" : "Lihat rincian pesanan"}
        onClick={() => setOpen((v) => !v)}
        className="block w-full px-4 py-3 text-left"
      >
        <div className="flex items-center justify-between gap-3 text-[12px] text-[#6b7c93]">
          <span>Total</span>
          {remainingLabel ? (
            <span>
              {expired ? (
                <span className="font-semibold text-[#e85d3b]">Waktu habis</span>
              ) : (
                <>
                  Bayar dalam{" "}
                  <span className="font-semibold tabular-nums text-[#1e6fd9]">
                    {remainingLabel}
                  </span>
                </>
              )}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[22px] font-bold tracking-tight text-[#1f2a37]">
            {formatIDR(payment.total_amount, payment.currency)}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={`size-5 shrink-0 text-[#1f2a37] transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-[#8a97a8]">
          Order ID #{payment.reference}
        </p>
      </button>
      {open ? (
        <div className="border-t border-[#e8eef4] px-4 py-4">
          <OrderDetails payment={payment} />
        </div>
      ) : null}
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
  "Setelah berhasil, tekan “Saya sudah bayar”.",
];

export function QrisPanel({
  payment,
  checking,
  onCheck,
}: {
  payment: PublicPayment;
  /** True while a manual status check is in flight. */
  checking: boolean;
  /** Re-checks the payment status right away. */
  onCheck: () => void;
}) {
  const [howOpen, setHowOpen] = useState(false);
  const isImageQr =
    payment.qris_data?.startsWith("data:image") ||
    payment.qris_data?.startsWith("http");

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold text-[#1f2a37]">QRIS</h2>
        <span className="rounded border border-[#e8eef4] px-1.5 py-0.5 text-[10px] font-extrabold italic tracking-wide text-[#1f2a37]">
          QRIS
        </span>
      </div>

      <div className="mt-4 text-center">
        {payment.qris_data ? (
          isImageQr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={payment.qris_data}
              alt="Kode QR QRIS"
              className="mx-auto aspect-square w-full max-w-60 object-contain"
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

        {payment.merchant_name ? (
          <p className="mt-2 text-[12px] text-[#6b7c93]">
            Penerima: <span className="font-medium">{payment.merchant_name}</span>
          </p>
        ) : null}

        {isImageQr ? (
          <button
            type="button"
            onClick={() => void saveQrImage(payment.qris_data as string, payment.reference)}
            className="mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-[#1e6fd9] transition hover:bg-[#eef5ff]"
          >
            <DownloadIcon className="size-4" aria-hidden="true" />
            Simpan QR
          </button>
        ) : null}
      </div>

      <div className="mt-3 border-y border-[#e8eef4]">
        <button
          type="button"
          aria-expanded={howOpen}
          onClick={() => setHowOpen((v) => !v)}
          className="flex h-11 w-full items-center gap-2 text-[13px] font-semibold text-[#1e6fd9]"
        >
          <CircleHelpIcon className="size-4.5" aria-hidden="true" />
          Cara bayar
          <ChevronDownIcon
            aria-hidden="true"
            className={`size-4 transition-transform ${howOpen ? "rotate-180" : ""}`}
          />
        </button>
        {howOpen ? (
          <div className="space-y-4 pb-4">
            <ol className="space-y-2">
              {STEPS.map((step, i) => (
                <li key={step} className="flex gap-3 text-[13px] text-[#3d4b5c]">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#eef5ff] text-[12px] font-semibold text-[#1e6fd9]">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <div>
              <p className="text-[12px] font-semibold text-[#1f2a37]">
                Aplikasi yang didukung
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {APPS.map((app) => (
                  <li
                    key={app}
                    className="rounded-full border border-[#e8eef4] bg-[#fafbfc] px-2.5 py-0.5 text-[11.5px] text-[#3d4b5c]"
                  >
                    {app}
                  </li>
                ))}
                <li className="px-1 py-0.5 text-[11.5px] text-[#8a97a8]">
                  dan aplikasi lain yang mendukung QRIS
                </li>
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-center text-[11.5px] text-[#8a97a8]" role="status">
        Status diperbarui otomatis. Jangan tutup halaman ini setelah membayar.
      </p>

      <button
        type="button"
        onClick={onCheck}
        disabled={checking}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-lg bg-[#2b2f36] text-[14px] font-semibold text-white transition hover:bg-[#1f2329] disabled:cursor-wait disabled:opacity-70"
      >
        {checking ? "Memeriksa pembayaran..." : "Saya sudah bayar"}
      </button>

      {payment.environment === "sandbox" && payment.qr_image_url ? (
        <div className="mt-3 rounded-lg border border-[#f5d48a] bg-[#fff7e6] p-3">
          <p className="text-[12.5px] font-medium text-[#c27a00]">
            Mode sandbox · uji pembayaran lewat Simulator
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void copyText(payment.qr_image_url as string, "URL QR disalin.")}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#f5d48a] bg-white px-3 text-[13px] font-semibold text-[#c27a00] transition hover:bg-[#fffaf0]"
            >
              <CopyIcon className="size-4" aria-hidden="true" />
              Salin URL QR
            </button>
            <a
              href={`/simulator?qr=${encodeURIComponent(payment.qr_image_url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[#c27a00] px-3 text-[13px] font-semibold text-white transition hover:bg-[#a86800]"
            >
              Buka Simulator
            </a>
          </div>
        </div>
      ) : null}
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

/** Navy band with the merchant's initial + name. Extra bottom padding leaves
 *  room for the SummaryCard that overlaps it. */
export function CheckoutHeader({
  merchantName,
  sandbox,
}: {
  merchantName?: string;
  sandbox: boolean;
}) {
  const name = merchantName?.trim() || "Pembayaran";
  return (
    <header className="flex items-center justify-between gap-3 bg-[#0c2a5b] px-4 pt-4 pb-16">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-[16px] font-bold text-[#0c2a5b]"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <p className="truncate text-[15px] font-semibold text-white">{name}</p>
      </div>
      {sandbox ? (
        <span className="shrink-0 rounded-full bg-[#fff7e6] px-2.5 py-1 text-[10.5px] font-semibold text-[#c27a00]">
          Sandbox
        </span>
      ) : null}
    </header>
  );
}

export function CheckoutFooter({ sandbox }: { sandbox: boolean }) {
  return (
    <div className="mt-4 space-y-1 px-1 text-center text-[11.5px] text-[#8a97a8]">
      {sandbox ? (
        <p className="font-medium text-[#c27a00]">
          Mode sandbox · bukan uang sungguhan
        </p>
      ) : null}
      <p className="inline-flex items-center justify-center gap-1.5">
        <LockIcon className="size-3.5" aria-hidden="true" />
        Pembayaran aman · Didukung oleh whuzpay
      </p>
    </div>
  );
}
