import Link from "next/link"
import { ArrowRight, Shield, UserCheck, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="h-6 w-6 ml-2" />
            <span>SecureEscrow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium">
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm font-medium">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
                <Button variant="ghost" size="sm" className="hover:cursor-pointer" >
                Log In
                </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="mr-3 hover:cursor-pointer">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-20 md:py-32">
          <div className="container flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Peer-to-Peer Transaction Platform</h1>
            <p className="mt-6 max-w-3xl text-lg md:text-xl text-muted-foreground">
              Our escrow service protects both buyers and sellers by holding funds until all transaction conditions are
              met.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2 hover:cursor-pointer">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" className="hover:cursor-pointer" variant="outline">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 bg-muted/50">
          <div className="container px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-lg shadow-sm">
                <div className="p-2 bg-primary/10 rounded-full w-fit mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure Escrow</h3>
                <p className="text-muted-foreground">
                  Funds are held securely until both parties confirm the transaction is complete.
                </p>
              </div>
              <div className="bg-background p-6 rounded-lg shadow-sm">
                <div className="p-2 bg-primary/10 rounded-full w-fit mb-4">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Dispute Resolution</h3>
                <p className="text-muted-foreground">
                  Our admin team helps resolve any issues that may arise during transactions.
                </p>
              </div>
              <div className="bg-background p-6 rounded-lg shadow-sm">
                <div className="p-2 bg-primary/10 rounded-full w-fit mb-4">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Low Fees</h3>
                <p className="text-muted-foreground">Competitive transaction fees with no hidden charges.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20">
          <div className="container px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <span className="font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Create Transaction</h3>
                <p className="text-sm text-muted-foreground">
                  Buyer or seller initiates a transaction with details and terms.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <span className="font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2">Secure Payment</h3>
                <p className="text-sm text-muted-foreground">Buyer sends payment to our secure escrow system.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <span className="font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-2">Delivery</h3>
                <p className="text-sm text-muted-foreground">Seller delivers goods or services as agreed.</p>
              </div>
              <div className="text-center">
                <div className="mx-auto bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <span className="font-bold text-primary">4</span>
                </div>
                <h3 className="font-semibold mb-2">Release Funds</h3>
                <p className="text-sm text-muted-foreground">
                  Buyer confirms receipt and funds are released to the seller.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 ml-2" />
            <span>SecureEscrow</span>
          </div>
          <p className="px-2 text-sm text-muted-foreground mt-4 md:mt-0">© 2024 SecureEscrow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}



