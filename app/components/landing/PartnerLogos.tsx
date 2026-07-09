import Image from "next/image";
import Container from "./Container";

const logos = [
  { src: "https://www.duitku.com/wp-content/uploads/2022/11/ICH.png", alt: "ICH" },
  { src: "https://www.duitku.com/wp-content/uploads/2022/11/UQ.png", alt: "Urban Quarter" },
  { src: "https://www.duitku.com/wp-content/uploads/2022/11/toyota.png", alt: "Toyota" },
  { src: "https://www.duitku.com/wp-content/uploads/2022/11/Niagahoster.png", alt: "Niagahoster" },
  { src: "https://www.duitku.com/wp-content/uploads/2022/11/MOSH.png", alt: "MOS Health" },
  { src: "https://www.duitku.com/wp-content/uploads/2022/11/KNC.png", alt: "KNC" },
  { src: "https://www.duitku.com/wp-content/uploads/2022/11/KF.png", alt: "KF" },
  { src: "https://www.duitku.com/wp-content/uploads/2025/04/vocagame-logo-1.png", alt: "Vocagame" },
  { src: "https://www.duitku.com/wp-content/uploads/2022/11/Metro.png", alt: "Metro" },
];

const track = [...logos, ...logos];

export default function PartnerLogos() {
  return (
    <section className="bg-white py-12">
      <Container>
        <div className="overflow-hidden">
          <div className="flex w-max animate-[marquee_28s_linear_infinite] items-center gap-20 hover:[animation-play-state:paused] motion-reduce:animate-none">
            {track.map((logo, i) => (
              <div key={`${logo.alt}-${i}`} className="relative h-14 w-40 shrink-0 md:h-16 md:w-44">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  sizes="(min-width: 768px) 176px, 160px"
                  className="object-contain grayscale transition hover:grayscale-0"
                />
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
