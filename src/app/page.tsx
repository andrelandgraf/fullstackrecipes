import type { Metadata } from "next";
import { Header } from "@/components/home/header";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Registry } from "@/components/home/registry";
import { RecipeGrid } from "@/components/recipes/grid";
import { Footer } from "@/components/home/footer";
import { HomeWrapper } from "@/components/home/home-wrapper";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <HomeWrapper>
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <Hero />
          <HowItWorks />
          <Registry />
          <RecipeGrid />
        </main>
        <Footer />
      </div>
    </HomeWrapper>
  );
}
