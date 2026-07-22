import Container from "./Container";

function DashboardMockup() {
  return (
    <div className="relative mx-auto aspect-4/3 w-full max-w-lg">
      {/* Tablet */}
      <div className="absolute right-0 top-0 w-[85%] rounded-2xl border-4 border-slate-800 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-xs font-bold italic text-brand-navy">whuzpay</span>
          <span className="text-[10px] text-slate-400">Dashboard</span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-medium text-slate-500">Saldo Pending</span>
            <span className="text-xs font-bold text-slate-700">Rp 30.223.00</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-teal-400 p-2 text-white">
              <p className="text-[9px] opacity-80">Sukses</p>
              <p className="text-xs font-bold">30.223,00</p>
            </div>
            <div className="rounded-lg bg-rose-400 p-2 text-white">
              <p className="text-[9px] opacity-80">Gagal</p>
              <p className="text-xs font-bold">0,00</p>
            </div>
            <div className="rounded-lg bg-cyan-400 p-2 text-white">
              <p className="text-[9px] opacity-80">Pending</p>
              <p className="text-xs font-bold">0,00</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-slate-100 p-3">
            <p className="mb-2 text-[10px] font-medium text-slate-400">Transfer</p>
            <div className="flex items-end gap-1.5">
              {[30, 55, 40, 70, 50, 65, 45, 80].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}px` }}
                  className="w-full rounded-sm bg-brand-navy-light/70"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="absolute bottom-0 left-0 w-40 rounded-2xl border-4 border-slate-800 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-3 py-2 text-center">
          <span className="text-[9px] font-bold italic text-brand-navy">whuzpay</span>
        </div>
        <div className="flex flex-col gap-1.5 p-3">
          {["VA BCA", "QRIS", "GoPay", "OVO"].map((m) => (
            <div
              key={m}
              className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1.5"
            >
              <span className="text-[9px] font-medium text-slate-500">{m}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            </div>
          ))}
          <div className="mt-1 rounded-md bg-brand-yellow px-2 py-1.5 text-center text-[9px] font-bold text-brand-navy-dark">
            BAYAR
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        className="absolute inset-0 bg-linear-to-br from-brand-navy-light via-brand-navy to-brand-navy-dark"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 58%, 0 90%)" }}
      />

      <Container className="relative grid items-center gap-12 pb-28 pt-36 lg:grid-cols-2 lg:pb-40 lg:pt-44">
        <div>
          <h1 className="max-w-3xl text-2xl font-extrabold capitalize leading-[1.2] tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
            One Integration, Every Payment.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Hubungkan bisnis Anda dengan berbagai metode pembayaran melalui satu platform yang dirancang untuk kecepatan, kemudahan, dan skalabilitas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#hubungi-sales"
              className="rounded-md bg-brand-yellow px-6 py-3 text-sm font-bold uppercase tracking-wide text-brand-navy-dark shadow-sm transition-colors hover:bg-brand-yellow-dark"
            >
              Jadwalkan Demo
            </a>
            <a
              href="#"
              className="rounded-md border border-white/40 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
            >
              Lihat Solusi
            </a>
          </div>
        </div>

        <DashboardMockup />
      </Container>
    </section>
  );
}
