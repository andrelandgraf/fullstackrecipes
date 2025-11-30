import { Header } from "@/components/home/header";
import { Hero } from "@/components/home/hero";
import { Playground } from "@/components/home/playground";
import { RecipeGrid } from "@/components/recipes/grid";
import { Footer } from "@/components/home/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Playground />
        <RecipeGrid />
      </main>
      <Footer />
    </div>
  );
}
