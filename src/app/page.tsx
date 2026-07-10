import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ProblemBenefit } from "@/components/marketing/problem-benefit";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Features } from "@/components/marketing/features";
import { Differentiator } from "@/components/marketing/differentiator";
import { SocialProof } from "@/components/marketing/social-proof";
import { PricingSection } from "@/components/marketing/pricing-section";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "TeamTestify — Collect and showcase customer testimonials",
  description:
    "Collect video and text testimonials in minutes and publish a Wall of Love or carousel widget on your site. No developer required.",
};

// Public marketing landing page — no dashboard chrome, reachable whether or
// not the visitor is signed in (the pricing section's Pro CTA depends on
// being able to tell the difference, so this deliberately does not redirect
// an authenticated visitor away).
export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProblemBenefit />
        <HowItWorks />
        <Features />
        <Differentiator />
        <SocialProof />
        <PricingSection />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
