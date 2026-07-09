import Image from "next/image";
import Container from "./Container";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const cards = [
  {
    title: "Penerimaan Pembayaran",
    iconBg: "bg-teal-400",
    description:
      "Bangun alur pembayaran yang lebih sederhana untuk pelanggan dan lebih mudah dikontrol untuk tim Anda. Cocok untuk checkout, invoice, maupun pembayaran operasional yang membutuhkan status transaksi yang jelas.",
    tags: ["QRIS", "Checkout", "Invoice", "API", "Webhook"],
  },
  {
    title: "Routing & Monitoring",
    iconBg: "bg-rose-400",
    description:
      "Siapkan fondasi payment orchestration sejak awal. Atur provider, webhook, prioritas routing, dan visibilitas transaksi dalam satu sistem yang lebih siap dikembangkan saat volume bisnis meningkat.",
    tags: ["Provider", "Fallback", "Status", "Logs", "Dashboard"],
  },
];

export default function Solutions() {
  return (
    <section className="bg-white py-20">
      <Container>
        <div className="text-center">
          <h2 className="mx-auto max-w-4xl text-2xl font-extrabold uppercase leading-[0.98] tracking-[-0.04em] text-brand-navy sm:text-3xl lg:text-4xl">
            Dirancang untuk transaksi hari ini dan pertumbuhan berikutnya
          </h2>
          <p className="mt-3 text-base text-slate-500 sm:text-lg">
            Bukan sekadar menerima pembayaran, tapi membangun fondasi operasional yang lebih rapi.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
              style={{
                clipPath:
                  "polygon(0 0, 100% 0, 100% 88%, 88% 100%, 0 100%)",
              }}
            >
              <div className="p-8">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${card.iconBg} text-white`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                </span>
                <h3 className="mt-5 text-lg font-extrabold uppercase leading-[1.02] tracking-[-0.03em] text-brand-navy sm:text-xl">
                  {card.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-slate-500 sm:text-[17px]">
                  {card.description}
                </p>
                <a
                  href="#"
                  className="mt-5 inline-flex items-center gap-1.5 text-base font-semibold text-brand-navy hover:gap-2.5"
                >
                  Pelajari lebih lanjut
                  <ArrowIcon />
                </a>
              </div>

              <div className="flex items-center justify-center gap-3 bg-slate-50 px-8 py-6">
                {card.tags.map((tag) => (
                  <Image
                    key={tag}
                    src={`https://placehold.co/64x32/ffffff/64748b.png?text=${encodeURIComponent(tag)}`}
                    alt={tag}
                    width={64}
                    height={32}
                    className="rounded-md shadow-sm"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
