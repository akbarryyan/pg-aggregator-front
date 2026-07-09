import Container from "./Container";

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M4 13a8 8 0 0 1 16 0" strokeLinecap="round" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" />
      <path d="M20 19v1a3 3 0 0 1-3 3h-3" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path d="M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export default function ServicePillars() {
  return (
    <section className="bg-white py-20">
      <Container className="grid gap-12 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="pr-0 sm:pr-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-brand-navy">
            <HeadsetIcon />
          </span>
          <h3 className="mt-5 text-lg font-extrabold uppercase leading-[1.02] tracking-[-0.03em] text-brand-navy sm:text-xl">
            Support yang Responsif
          </h3>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-slate-500 sm:text-[17px]">
            Tim kami siap membantu saat Anda onboarding, menguji integrasi,
            atau menelusuri issue transaksi. Respons yang cepat penting
            karena pembayaran tidak boleh menunggu terlalu lama.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Telepon", "Email", "Live Chat"].map((label) => (
              <span
                key={label}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-600"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-12 pl-0 sm:pl-10 sm:pt-0">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-brand-navy">
            <PinIcon />
          </span>
          <h3 className="mt-5 text-lg font-extrabold uppercase leading-[1.02] tracking-[-0.03em] text-brand-navy sm:text-xl">
            Dibangun dengan Perspektif Operasional
          </h3>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-slate-500 sm:text-[17px]">
            Kami memahami bahwa bisnis butuh lebih dari sekadar tombol
            bayar. Dibutuhkan status yang akurat, webhook yang rapi, dan
            kontrol provider yang bisa diandalkan saat transaksi mulai
            bertambah.
          </p>
          <div className="mt-5">
            <span className="inline-block rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
              Fondasi yang siap dikembangkan
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
