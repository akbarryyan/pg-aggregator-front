"use client";

import type { SimulationOutcome } from "@/lib/merchant-api";

type Labels = { title: string; paid: string; failed: string; expired: string };

export const SIMULATOR_LABELS_ID: Labels = {
  title: "Simulator sandbox · bukan uang sungguhan",
  paid: "Simulasikan dibayar",
  failed: "Simulasikan gagal",
  expired: "Simulasikan kedaluwarsa",
};

export const SIMULATOR_LABELS_EN: Labels = {
  title: "Sandbox simulator · no real money",
  paid: "Simulate paid",
  failed: "Simulate failed",
  expired: "Simulate expired",
};

/** Yellow box with three buttons that drive a pending sandbox payment. */
export default function SandboxSimulator({
  labels,
  busy,
  onSimulate,
}: {
  labels: Labels;
  /** The outcome being simulated, or null when idle. */
  busy: SimulationOutcome | null;
  onSimulate: (outcome: SimulationOutcome) => void;
}) {
  const buttons: { outcome: SimulationOutcome; label: string; className: string }[] = [
    { outcome: "paid", label: labels.paid, className: "bg-[#2f9e5a] text-white hover:bg-[#278a4e]" },
    { outcome: "failed", label: labels.failed, className: "bg-white text-[#e85d3b] border border-[#f3c9bd] hover:bg-[#fff1ed]" },
    { outcome: "expired", label: labels.expired, className: "bg-white text-[#6b7c93] border border-[#e8eef4] hover:bg-[#f4f7fb]" },
  ];
  return (
    <div className="rounded-xl border border-[#f5d48a] bg-[#fff7e6] p-3">
      <p className="text-[12px] font-semibold text-[#c27a00]">{labels.title}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        {buttons.map((b) => (
          <button
            key={b.outcome}
            type="button"
            disabled={busy !== null}
            aria-busy={busy === b.outcome}
            aria-label={b.label}
            onClick={() => onSimulate(b.outcome)}
            className={`min-h-10 py-2 min-w-0 flex-1 rounded-lg px-3 text-[12.5px] font-semibold transition disabled:cursor-wait disabled:opacity-60 ${b.className}`}
          >
            {busy === b.outcome ? "…" : b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
