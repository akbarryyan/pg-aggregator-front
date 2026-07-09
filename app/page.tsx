import Navbar from "./components/landing/Navbar";
import Hero from "./components/landing/Hero";
import PartnerLogos from "./components/landing/PartnerLogos";
import Solutions from "./components/landing/Solutions";
import MediaFeature from "./components/landing/MediaFeature";
import TestimonialCarousel from "./components/landing/TestimonialCarousel";
import ServicePillars from "./components/landing/ServicePillars";
import FAQSection from "./components/landing/FAQSection";
import CtaRow from "./components/landing/CtaRow";
import Footer from "./components/landing/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <PartnerLogos />
        <Solutions />
        <MediaFeature />
        <TestimonialCarousel />
        <ServicePillars />
        <FAQSection />
        <CtaRow />
      </main>
      <Footer />
    </div>
  );
}
