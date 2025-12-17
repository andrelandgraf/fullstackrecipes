import type { Metadata } from "next";
import { Header } from "@/components/home/header";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Registry } from "@/components/home/registry";
import { Demo } from "@/components/home/playground";
import { RecipeGrid } from "@/components/recipes/grid";
import { Footer } from "@/components/home/footer";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Registry />
        <Demo />
        <Suspense>
          <RecipeGrid />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
