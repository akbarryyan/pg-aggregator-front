"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import ConfirmedActionDialog from "@/app/components/admin/ConfirmedActionDialog";
import {
  fetchPaymentRefunds,
  refundPayment,
  REFUND_REASON_MAX,
  type AdminRefundSummary,
} from "@/lib/admin-payouts";
import {
  fetchAdminPayment,
  fetchAdminPaymentCallbacks,
  fetchAdminPaymentEvents,
  type AdminCallback,
  type AdminLog,
  type AdminPayment,
} from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  EmptyState,
  formatDateTime,
  formatIDR,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from "../../../../components/admin/ui";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
        {label}
      </p>
      <div className="mt-1 text-[13.5px] font-medium break-all text-[#1f2a37]">
        {value || "—"}
      </div>
    </div>
  );
}

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [payment, setPayment] = useState<AdminPayment | null>(null);
  const [events, setEvents] = useState<AdminLog[]>([]);
  const [callbacks, setCallbacks] = useState<AdminCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<AdminRefundSummary | null>(null);
  const [refundsError, setRefundsError] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [data, ev, cb] = await Promise.all([
          fetchAdminPayment(id),
          fetchAdminPaymentEvents(id),
          fetchAdminPaymentCallbacks(id).catch(() => ({ items: [] as AdminCallback[] })),
        ]);
        // Refund info is optional context; a failure must not hide the payment.
        let rfFailed = false;
        const rf = await fetchPaymentRefunds(id).catch(() => {
          rfFailed = true;
          return null;
        });
        if (!cancelled) {
          setPayment(data);
          setEvents(ev.items ?? []);
          setCallbacks(cb.items ?? []);
          setRefunds(rf);
          setRefundsError(rfFailed);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Failed to load payment.",
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
  }, [id, reloadKey]);

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Payment detail"
        description="Full transaction context for support and debugging."
        actions={
          <Link
            href="/admin/payments"
            className="text-[13px] font-semibold text-[#6b7c93] hover:text-[#06163a]"
          >
            ← Back to payments
          </Link>
        }
      />

      {loading ? (
        <Card>
          <LoadingBlock />
        </Card>
      ) : !payment ? (
        <Card className="p-6 text-[13px] text-[#8a97a8]">Payment not found.</Card>
      ) : (
        <>
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] text-[#8a97a8]">Reference</p>
                <h2 className="mt-1 break-all text-[18px] font-semibold text-[#1f2a37]">
                  {payment.reference}
                </h2>
                <p className="mt-1 break-words text-[13px] text-[#6b7c93]">
                  {payment.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={payment.status} />
                {refunds?.refundable && (
                  <Button
                    type="button"
                    className="max-lg:h-9"
                    onClick={() => setRefundOpen(true)}
                  >
                    Refund
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Field
                label="Nominal"
                value={formatIDR(payment.amount, payment.currency)}
              />
              {payment.fee_amount > 0 && (
                <>
                  <Field
                    label="Fee"
                    value={formatIDR(payment.fee_amount, payment.currency)}
                  />
                  <Field
                    label="Total"
                    value={formatIDR(payment.total_amount, payment.currency)}
                  />
                </>
              )}
              <Field label="Merchant" value={payment.merchant_name || "—"} />
              <Field
                label="Merchant ID"
                value={
                  <Link
                    href={`/admin/merchants/${payment.merchant_id}`}
                    className="text-[#ff5e16] hover:underline"
                  >
                    {payment.merchant_id}
                  </Link>
                }
              />
              <Field label="Method" value={payment.payment_method} />
              <Field label="Provider" value={payment.provider_name} />
              <Field
                label="Provider reference"
                value={payment.provider_reference || "—"}
              />
              <Field label="Customer name" value={payment.customer_name || "—"} />
              <Field
                label="Customer email"
                value={payment.customer_email || "—"}
              />
              <Field label="Created" value={formatDateTime(payment.created_at)} />
              <Field label="Expires" value={formatDateTime(payment.expires_at)} />
              <Field label="Paid at" value={formatDateTime(payment.paid_at)} />
              <Field label="Updated" value={formatDateTime(payment.updated_at)} />
            </div>
          </Card>

          {refundsError && payment.status === "paid" && (
            <Card className="flex items-center justify-between gap-3 p-4 text-[13px] text-[#e85d3b]">
              <span>Could not load refund information.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="max-lg:h-9"
                onClick={() => setReloadKey((k) => k + 1)}
              >
                Retry
              </Button>
            </Card>
          )}

          {refunds && (refunds.items?.length ?? 0) > 0 && (
            <Card className="p-5 sm:p-6">
              <h3 className="text-[15px] font-semibold text-[#1f2a37]">
                Refunds
              </h3>
              <p className="mt-1 text-[12.5px] text-[#8a97a8]">
                Refunded {formatIDR(refunds.refunded_amount, payment.currency)}{" "}
                of {formatIDR(refunds.merchant_net_amount, payment.currency)}{" "}
                refundable · remaining{" "}
                {formatIDR(refunds.remaining_refundable, payment.currency)}
              </p>
              <ul className="mt-4 space-y-2">
                {(refunds.items ?? []).map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#1f2a37]">
                        {formatIDR(r.amount, payment.currency)}
                      </p>
                      <span className="text-[12px] text-[#8a97a8]">
                        {formatDateTime(r.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-[12.5px] text-[#3d4b5c]">
                      {r.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {refundOpen && refunds && (
            <ConfirmedActionDialog
              open
              onOpenChange={setRefundOpen}
              title="Refund payment"
              description={`Up to ${formatIDR(refunds.remaining_refundable, payment.currency)} can still be refunded.`}
              warning="Refund is recorded only; return the money to the customer manually. The reason is visible to the merchant."
              amount={{
                label: "Amount (IDR)",
                initial: refunds.remaining_refundable,
                maxAbs: refunds.remaining_refundable,
                hint: "Whole rupiah, greater than 0 and at most the remaining refundable amount.",
              }}
              text={{ label: "Reason", maxLength: REFUND_REASON_MAX }}
              confirmLabel="Confirm refund"
              destructive
              summary={(v) =>
                `Refund ${formatIDR(v.amount ?? 0, payment.currency)} of ${payment.reference}\nReason: ${v.text}`
              }
              onSubmit={async (v) => {
                const res = await refundPayment(payment.id, v.amount ?? 0, v.text);
                toast.success(
                  res.payment_status === "refunded"
                    ? "Payment fully refunded."
                    : "Refund recorded.",
                );
                setReloadKey((k) => k + 1);
              }}
            />
          )}

          {(payment.qris_data || payment.callback_url) && (
            <Card className="p-5 sm:p-6">
              <h3 className="text-[15px] font-semibold text-[#1f2a37]">
                Technical details
              </h3>
              <div className="mt-4 space-y-3">
                {payment.callback_url && (
                  <Field label="Callback URL" value={payment.callback_url} />
                )}
                {payment.qris_data && (
                  <div className="rounded-lg bg-[#f8fafc] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                      QRIS data
                    </p>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[12px] text-[#3d4b5c]">
                      {payment.qris_data}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold text-[#1f2a37]">
                  Merchant callbacks
                </h3>
                <p className="mt-1 text-[12.5px] text-[#8a97a8]">
                  Outbound deliveries to merchant webhook after status changes.
                </p>
              </div>
              <Link
                href="/admin/callbacks"
                className="text-[12.5px] font-semibold text-[#ff5e16] hover:underline"
              >
                View all callbacks
              </Link>
            </div>
            {callbacks.length === 0 ? (
              <div className="mt-4">
                <EmptyState message="No merchant callbacks for this payment yet." />
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {callbacks.map((cb) => (
                  <div
                    key={cb.id}
                    className="rounded-lg border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#1f2a37]">
                        {cb.event_type}
                        <span className="ml-2 text-[11px] font-medium text-[#8a97a8]">
                          attempt #{cb.attempt_number}
                        </span>
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          cb.status === "success"
                            ? "bg-[#e8f8ee] text-[#2f9e5a]"
                            : cb.status === "failed"
                              ? "bg-[#fff1ed] text-[#e85d3b]"
                              : "bg-[#fff7e6] text-[#c27a00]"
                        }`}
                      >
                        {cb.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-[#8a97a8]">
                      {formatDateTime(cb.created_at)} · {cb.target_url}
                      {cb.http_status != null ? ` · HTTP ${cb.http_status}` : ""}
                    </p>
                    {cb.error_message && (
                      <p className="mt-1 break-words text-[12px] text-[#e85d3b]">
                        {cb.error_message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <h3 className="text-[15px] font-semibold text-[#1f2a37]">
              Event timeline
            </h3>
            <p className="mt-1 text-[12.5px] text-[#8a97a8]">
              Webhook and processing events linked to this payment.
            </p>

            {events.length === 0 ? (
              <div className="mt-4">
                <EmptyState message="No webhook events for this payment yet." />
              </div>
            ) : (
              <ol className="relative mt-5 space-y-0 border-l border-[#e8eef4] ml-2">
                {events.map((ev) => (
                  <li key={ev.id} className="relative mb-5 ml-4 last:mb-0">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-[#3b9eff] ring-4 ring-white" />
                    <div className="rounded-lg border border-[#eef2f6] bg-[#fbfcfe] px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[#1f2a37]">
                          {ev.event_type}
                        </p>
                        <StatusBadge status={ev.status} />
                      </div>
                      <p className="mt-1 text-[12px] text-[#8a97a8]">
                        {formatDateTime(ev.created_at)}
                        {" · "}
                        <span className="capitalize">{ev.provider_name}</span>
                        {ev.is_processed ? " · processed" : " · not processed"}
                      </p>
                      {ev.processing_error && (
                        <p className="mt-2 break-words text-[12px] text-[#e85d3b]">
                          {ev.processing_error}
                        </p>
                      )}
                      <Link
                        href={`/admin/logs/${ev.id}`}
                        className="mt-2 inline-block text-[12.5px] font-semibold text-[#ff5e16] hover:underline max-lg:py-2.5"
                      >
                        View log detail
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
