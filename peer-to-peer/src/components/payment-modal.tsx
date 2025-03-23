"use client"

import type React from "react"

import { useState } from "react"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { fundEscrow } from "@/lib/actions/transaction-actions"

// Load Stripe outside of component to avoid recreating it on renders
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

interface PaymentModalProps {
  clientSecret: string
  paymentIntentId: string
  transactionId: string
  amount: number
  currency: string
  onClose: () => void
  onSuccess: () => void
}

export function PaymentModal({
  clientSecret,
  paymentIntentId,
  transactionId,
  amount,
  currency,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fund Escrow</CardTitle>
            <CardDescription>Complete payment to fund the escrow</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm
            paymentIntentId={paymentIntentId}
            transactionId={transactionId}
            amount={amount}
            currency={currency}
            onSuccess={onSuccess}
          />
        </Elements>
      </Card>
    </div>
  )
}

function CheckoutForm({
  paymentIntentId,
  transactionId,
  amount,
  currency,
  onSuccess,
}: {
  paymentIntentId: string
  transactionId: string
  amount: number
  currency: string
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    })

    if (result.error) {
      setError(result.error.message || "An error occurred during payment")
      setProcessing(false)
      return
    }

    // Payment succeeded, now fund the escrow
    const escrowResult = await fundEscrow(transactionId, paymentIntentId)

    if (escrowResult.error) {
      setError(escrowResult.error)
      setProcessing(false)
      return
    }

    setSucceeded(true)
    setProcessing(false)

    // Notify parent component of success
    setTimeout(() => {
      onSuccess()
    }, 2000)
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <div className="text-center py-2">
          <p className="text-lg font-semibold">
            ${amount.toFixed(2)} {currency.toUpperCase()}
          </p>
          <p className="text-sm text-muted-foreground">
            Funds will be held in escrow until you approve the transaction
          </p>
        </div>

        <PaymentElement />

        {error && <div className="bg-destructive/15 p-3 rounded-md text-sm text-destructive">{error}</div>}

        {succeeded && (
          <div className="bg-green-50 p-3 rounded-md text-sm text-green-700">
            Payment successful! Escrow has been funded.
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" disabled={!stripe || processing || succeeded}>
          {processing ? "Processing..." : succeeded ? "Funded Successfully" : "Pay Now"}
        </Button>
      </CardFooter>
    </form>
  )
}

