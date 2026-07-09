import Image from "next/image";
import Container from "./Container";

function ArrowButton({ direction }: { direction: "left" | "right" }) {
  return (
    <button
      aria-label={direction === "left" ? "Previous" : "Next"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-brand-navy hover:text-brand-navy"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        {direction === "left" ? (
          <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

export default function TestimonialCarousel() {
  return (
    <section className="bg-white pb-20 pt-16">
      <Container className="flex items-center justify-center gap-4">
        <ArrowButton direction="left" />

        <div className="w-full max-w-2xl rounded-xl border border-slate-100 p-10 text-center shadow-sm">
          <Image
            src="https://placehold.co/160x40/ffffff/14b8a6.png?text=VOCAGAME"
            alt="Vocagame"
            width={160}
            height={40}
            className="mx-auto"
          />
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg">
            WhuzPay membantu kami menjaga pengalaman pembayaran tetap rapi,
            mudah dipantau, dan cepat ditindaklanjuti saat tim operasional
            membutuhkan visibilitas lebih. Buat kami, itu sama pentingnya
            dengan harga dan fitur.
          </p>
          <p className="mt-6 text-base font-bold text-slate-800">
            Hardi Wijaya
          </p>
          <p className="text-sm text-slate-400">
            Chief Commercial Officer Vocagame
          </p>
        </div>

        <ArrowButton direction="right" />
      </Container>
    </section>
  );
}
