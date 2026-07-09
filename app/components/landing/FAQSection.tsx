"use client";

import { useState } from "react";
import Container from "./Container";

const questions = [
  "Apa itu WhuzPay?",
  "Berapa harga layanan WhuzPay payment gateway?",
  "Bagaimana cara untuk mulai menggunakan WhuzPay?",
  "Bagaimana cara menggunakan fitur disbursement?",
];

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path d="M7 3h7l4 4v14H7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Illustration() {
  return (
    <div className="relative mx-auto aspect-4/3 w-full max-w-sm">
      <div className="absolute inset-6 rounded-full border-2 border-dashed border-brand-navy-light/30" />
      <div className="absolute left-1/2 top-1/2 w-56 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-yellow" />
          <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
        </div>
        <div className="space-y-2">
          <div className="h-2 w-3/4 rounded bg-slate-100" />
          <div className="h-2 w-full rounded bg-slate-100" />
          <div className="h-2 w-2/3 rounded bg-slate-100" />
        </div>
      </div>
      <span className="absolute bottom-2 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-teal-400 text-white shadow-lg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

export default function FAQSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-sky-50 py-20">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <Illustration />
          <h2 className="mt-8 max-w-xl text-2xl font-extrabold leading-[0.98] tracking-[-0.035em] text-brand-navy sm:text-3xl">
            Pertanyaan yang sering muncul sebelum mulai
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-slate-500 sm:text-lg">
            Berikut rangkuman hal yang biasanya ingin dipastikan sebelum
            integrasi berjalan. Jika masih ada kebutuhan khusus, tim kami
            siap bantu diskusikan alur yang paling sesuai.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex items-center gap-2 text-brand-navy">
            <DocIcon />
            <span className="text-sm font-bold uppercase tracking-wide">
              Frequently Asked Questions
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {questions.map((q, i) => (
              <button
                key={q}
                onClick={() => setOpen(open === i ? -1 : i)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left"
              >
                <span className="text-base font-medium text-slate-700 sm:text-lg">
                  {q}
                </span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-transform ${
                    open === i ? "rotate-45 border-brand-navy text-brand-navy" : ""
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
