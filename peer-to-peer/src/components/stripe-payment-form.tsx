"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createPaymentIntent, processStripePayment } from "@/lib/actions/payment-actions"

// Load Stripe outside of component to avoid recreating it on renders
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

interface StripePaymentFormProps {
  amount: number
  onSuccess: () => void
  onCancel: () => void
}

export function StripePaymentForm({ amount, onSuccess, onCancel }: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function createIntent() {
      try {
        setLoading(true)
        const result = await createPaymentIntent(amount)

        if (result.error) {
          setError(result.error)
          setLoading(false)
          return
        }

        setClientSecret(result.clientSecret!)
        setPaymentIntentId(result.paymentIntentId!)
      } catch (err: any) {
        setError(err.message || "Failed to initialize payment")
      } finally {
        setLoading(false)
      }
    }

    createIntent()
  }, [amount])

  if (loading && !clientSecret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Initializing Payment...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">{error}</div>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">
            Go Back
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (!clientSecret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">Failed to initialize payment. Please try again.</div>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel} className="w-full">
            Go Back
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm amount={amount} paymentIntentId={paymentIntentId!} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  )
}

function CheckoutForm({
  amount,
  paymentIntentId,
  onSuccess,
  onCancel,
}: {
  amount: number
  paymentIntentId: string
  onSuccess: () => void
  onCancel: () => void
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

    // Payment succeeded, now process it on the server
    const processResult = await processStripePayment(paymentIntentId)

    if (processResult.error) {
      setError(processResult.error)
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
    <Card>
      <CardHeader>
        <CardTitle>Add ${amount.toFixed(2)} to Wallet</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <PaymentElement />

          {error && <div className="bg-destructive/15 p-3 rounded-md text-sm text-destructive">{error}</div>}

          {succeeded && (
            <div className="bg-green-50 p-3 rounded-md text-sm text-green-700">
              Payment successful! Funds have been added to your wallet.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button type="submit" disabled={!stripe || processing || succeeded}>
            {processing ? "Processing..." : succeeded ? "Funded Successfully" : "Pay Now"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

