import type { Metadata } from "next";
import { Header } from "@/components/home/header";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Registry } from "@/components/home/registry";
import { Demo } from "@/components/home/playground";
import { RecipeGridWrapper } from "@/components/recipes/grid-wrapper";
import { Community } from "@/components/home/community";
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
          <Demo />
          <Community />
          <RecipeGridWrapper />
        </main>
        <Footer />
      </div>
    </HomeWrapper>
  );
}
