import { Header } from "@/components/home/header"
import { Hero } from "@/components/home/hero"
import { Features } from "@/components/home/features"
import { Stats } from "@/components/home/stats"
import { Ecosystem } from "@/components/home/ecosystem"
import { News } from "@/components/home/news"
import { Footer } from "@/components/home/footer"

export function HomePage() {

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <Hero />
        <Features />
        <Stats />
        <Ecosystem />
        <News />
      </main>

      <Footer />
    </div>
  )
}