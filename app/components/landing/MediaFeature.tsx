import Image from "next/image";
import Container from "./Container";

export default function MediaFeature() {
  return (
    <section className="relative overflow-hidden bg-slate-800 py-24 sm:py-32">
      <Image
        src="https://placehold.co/1600x800/1e293b/475569.png?text=Foto+Kantor"
        alt="Foto kantor"
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/30 to-black/60" />

      <Container className="relative flex justify-center lg:justify-end">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
          <div className="flex items-center gap-2">
            <Image
              src="https://placehold.co/64x64/e11d48/ffffff.png?text=MI"
              alt="Media Indonesia"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="text-base font-bold text-slate-700">
              MEDIA INDONESIA
            </span>
          </div>
          <p className="mt-5 text-xl font-extrabold uppercase leading-none tracking-[-0.035em] text-brand-navy sm:text-2xl">
            &ldquo;Proses pembayaran yang lebih rapi membuat operasional tim
            kami bergerak lebih cepat.&rdquo;
          </p>
          <a
            href="#"
            className="mt-5 inline-block text-base font-semibold text-brand-navy-light hover:underline"
          >
            Lihat bagaimana brand dan organisasi mengelola transaksi dengan alur yang lebih efisien
          </a>
        </div>
      </Container>
    </section>
  );
}
