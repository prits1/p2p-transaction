"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { createTransaction } from "@/lib/actions/transaction-actions"

export default function NewTransactionPage() {
  const router = useRouter()
  const [role, setRole] = useState("buyer")
  const [paymentMethod, setPaymentMethod] = useState("bank")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    try {
      const result = await createTransaction(formData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push(`/dashboard/transactions/${result.transactionId}`)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Create New Transaction"
        text="Set up a new escrow transaction with a buyer or seller."
      />
      <Card>
        <form action={handleSubmit}>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Provide the details for your new escrow transaction.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Your Role</Label>
              <RadioGroup defaultValue="buyer" name="role" className="grid grid-cols-2 gap-4" onValueChange={setRole}>
                <div>
                  <RadioGroupItem value="buyer" id="buyer" className="peer sr-only" />
                  <Label
                    htmlFor="buyer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="font-semibold">I am the Buyer</span>
                    <span className="text-sm text-muted-foreground">I will send payment</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="seller" id="seller" className="peer sr-only" />
                  <Label
                    htmlFor="seller"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="font-semibold">I am the Seller</span>
                    <span className="text-sm text-muted-foreground">I will receive payment</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="counterparty">{role === "buyer" ? "Seller's Email" : "Buyer's Email"}</Label>
              <Input id="counterparty" name="counterparty" placeholder="Enter email address" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select defaultValue="usd" name="currency">
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                    <SelectItem value="gbp">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Transaction Title</Label>
              <Input id="title" name="title" placeholder="e.g., Purchase of laptop, Freelance design work" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the goods or services being exchanged"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup
                defaultValue="bank"
                name="paymentMethod"
                className="grid grid-cols-3 gap-4"
                onValueChange={setPaymentMethod}
              >
                <div>
                  <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                  <Label
                    htmlFor="bank"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="font-semibold">Bank Transfer</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="card" id="card" className="peer sr-only" />
                  <Label
                    htmlFor="card"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="font-semibold">Credit Card</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="wallet" id="wallet" className="peer sr-only" />
                  <Label
                    htmlFor="wallet"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="font-semibold">Wallet Balance</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === "bank" && (
              <div className="space-y-2">
                <Label htmlFor="paymentDetails">Bank Account</Label>
                <Select defaultValue="default" name="paymentDetails">
                  <SelectTrigger id="paymentDetails">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Primary Checking Account (****1234)</SelectItem>
                    <SelectItem value="secondary">Secondary Savings Account (****5678)</SelectItem>
                    <SelectItem value="new">+ Add New Bank Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="space-y-2">
                <Label htmlFor="paymentDetails">Credit Card</Label>
                <Select defaultValue="visa" name="paymentDetails">
                  <SelectTrigger id="paymentDetails">
                    <SelectValue placeholder="Select credit card" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa ending in 4242</SelectItem>
                    <SelectItem value="mastercard">Mastercard ending in 5555</SelectItem>
                    <SelectItem value="new">+ Add New Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                By creating this transaction, you agree to our terms of service and escrow fees.
                {role === "buyer"
                  ? " As a buyer, you'll need to fund the escrow before the seller proceeds."
                  : " As a seller, the buyer will need to fund the escrow before you proceed."}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.back()} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Transaction"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </DashboardShell>
  )
}

