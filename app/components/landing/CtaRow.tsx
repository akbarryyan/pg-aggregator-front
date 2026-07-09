import Container from "./Container";

export default function CtaRow() {
  return (
    <section id="hubungi-sales" className="bg-white py-16">
      <Container className="flex flex-col items-start justify-between gap-6 border-b border-slate-100 pb-16 lg:flex-row lg:items-center">
        <div>
          <h2 className="max-w-2xl text-2xl font-extrabold leading-[0.98] tracking-[-0.035em] text-brand-navy sm:text-3xl">
            Siap menata alur pembayaran bisnis Anda?
          </h2>
          <p className="mt-3 max-w-lg text-base text-slate-500 sm:text-lg">
            Ceritakan kebutuhan bisnis Anda, lalu kita susun alur integrasi,
            checkout, dan routing pembayaran yang paling relevan.
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <a
            href="#"
            className="rounded-md bg-brand-yellow px-6 py-3 text-sm font-bold uppercase tracking-wide text-brand-navy-dark shadow-sm transition-colors hover:bg-brand-yellow-dark"
          >
            Hubungi Sales
          </a>
          <a
            href="#"
            className="rounded-md border border-slate-200 px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-50"
          >
            Konsultasi Sekarang
          </a>
        </div>
      </Container>
    </section>
  );
}
