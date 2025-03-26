"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Wallet } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { createTransaction } from "@/lib/actions/transaction-actions"
import { getCurrentUser } from "@/lib/actions/auth-actions"

export default function NewTransactionPage() {
  const router = useRouter()
  const [role, setRole] = useState("buyer")
  const [paymentMethod, setPaymentMethod] = useState("bank")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [useWallet, setUseWallet] = useState(false)
  const [amount, setAmount] = useState<number>(0)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    currency: "usd",
    counterparty: "",
    paymentDetails: "default",
  })

  useEffect(() => {
    async function loadUserData() {
      try {
        const userData = await getCurrentUser()
        if (userData) {
          setWalletBalance(userData.walletBalance)
        }
      } catch (err) {
        console.error("Failed to load user data", err)
      }
    }

    loadUserData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === "amount") {
      setAmount(Number.parseFloat(value) || 0)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create FormData object
      const submitData = new FormData()
      submitData.append("title", formData.title)
      submitData.append("description", formData.description)
      submitData.append("amount", formData.amount)
      submitData.append("currency", formData.currency)
      submitData.append("role", role)
      submitData.append("counterparty", formData.counterparty)
      submitData.append("paymentMethod", paymentMethod)
      submitData.append("paymentDetails", formData.paymentDetails)

      // Add the useWallet flag to the form data
      if (role === "buyer" && paymentMethod === "wallet") {
        submitData.append("useWallet", useWallet.toString())
      }

      const result = await createTransaction(submitData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      if (result.warning) {
        setError(result.warning)
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
        <form onSubmit={handleSubmit}>
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
              <RadioGroup
                defaultValue="buyer"
                name="role"
                className="grid grid-cols-2 gap-4"
                value={role}
                onValueChange={setRole}
              >
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
              <Input
                id="counterparty"
                name="counterparty"
                placeholder="Enter email address"
                required
                value={formData.counterparty}
                onChange={handleInputChange}
              />
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
                    value={formData.amount}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  defaultValue="usd"
                  name="currency"
                  value={formData.currency}
                  onValueChange={(value) => handleSelectChange("currency", value)}
                >
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
              <Input
                id="title"
                name="title"
                placeholder="e.g., Purchase of laptop, Freelance design work"
                required
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the goods or services being exchanged"
                rows={3}
                required
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup
                defaultValue="bank"
                name="paymentMethod"
                className="grid grid-cols-3 gap-4"
                value={paymentMethod}
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

            {role === "buyer" && paymentMethod === "wallet" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Wallet Balance</Label>
                  <span className="text-sm font-medium">${walletBalance.toFixed(2)}</span>
                </div>

                {amount > 0 && (
                  <div className="p-4 rounded-md bg-muted">
                    {amount <= walletBalance ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Sufficient balance for this transaction</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="useWallet"
                            checked={useWallet}
                            onCheckedChange={(checked) => setUseWallet(checked === true)}
                          />
                          <Label htmlFor="useWallet" className="text-sm">
                            Fund immediately from wallet
                          </Label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">
                          Insufficient balance (${walletBalance.toFixed(2)}) for this transaction (${amount.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "bank" && (
              <div className="space-y-2">
                <Label htmlFor="paymentDetails">Bank Account</Label>
                <Select
                  defaultValue="default"
                  name="paymentDetails"
                  value={formData.paymentDetails}
                  onValueChange={(value) => handleSelectChange("paymentDetails", value)}
                >
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
                <Select
                  defaultValue="visa"
                  name="paymentDetails"
                  value={formData.paymentDetails}
                  onValueChange={(value) => handleSelectChange("paymentDetails", value)}
                >
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





