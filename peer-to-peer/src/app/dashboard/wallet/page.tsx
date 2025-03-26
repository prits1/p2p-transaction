"use client"

import { useState, useEffect } from "react"
import { CreditCard, Plus, Wallet, ArrowUpRight, ArrowDownLeft, DollarSign, CheckCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import {
  addBankAccount,
  getBankAccounts,
  addFundsToWallet,
  getWalletTransactions,
  addCreditCard,
  getCreditCards,
} from "@/lib/actions/payment-actions"
import { getCurrentUser } from "@/lib/actions/auth-actions"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CreditCardForm } from "@/components/credit-card-form"

export default function WalletPage() {
  const [user, setUser] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [creditCards, setCreditCards] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [showAddBankForm, setShowAddBankForm] = useState(false)
  const [showAddFundsForm, setShowAddFundsForm] = useState(false)
  const [showAddCardForm, setShowAddCardForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fundAmount, setFundAmount] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<string>("bank")
  const [selectedPaymentSource, setSelectedPaymentSource] = useState<string>("default")

  useEffect(() => {
    async function loadData() {
      try {
        // Get user data
        const userData = await getCurrentUser()
        if (userData) {
          setUser(userData)
        }

        // Get bank accounts
        const accountsResult = await getBankAccounts()
        if (accountsResult.success) {
          setBankAccounts(accountsResult.bankAccounts)
        }

        // Get credit cards
        const cardsResult = await getCreditCards()
        if (cardsResult.success) {
          setCreditCards(cardsResult.cards)
        }

        // Get wallet transactions
        const transactionsResult = await getWalletTransactions()
        if (transactionsResult.success) {
          setTransactions(transactionsResult.transactions)
        }
      } catch (err) {
        console.error("Failed to load wallet data:", err)
        setError("Failed to load wallet data. Please try again.")
      }
    }

    loadData()
  }, [])

  async function handleAddBankAccount(formData: FormData) {
    setLoading(true)
    setError(null)

    try {
      const result = await addBankAccount(formData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Refresh bank accounts
      const accountsResult = await getBankAccounts()
      if (accountsResult.success) {
        setBankAccounts(accountsResult.bankAccounts)
      }

      setShowAddBankForm(false)
      setSuccess("Bank account added successfully")
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  async function handleAddCreditCard(formData: FormData) {
    setLoading(true)
    setError(null)

    try {
      const result = await addCreditCard(formData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Refresh credit cards
      const cardsResult = await getCreditCards()
      if (cardsResult.success) {
        setCreditCards(cardsResult.cards)
      }

      setShowAddCardForm(false)
      setSuccess("Credit card added successfully")
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  async function handleAddFunds() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!fundAmount || isNaN(Number.parseFloat(fundAmount)) || Number.parseFloat(fundAmount) <= 0) {
      setError("Please enter a valid amount")
      setLoading(false)
      return
    }

    try {
      const amount = Number.parseFloat(fundAmount)
      const result = await addFundsToWallet(amount, paymentMethod, selectedPaymentSource)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(`Successfully added $${amount.toFixed(2)} to your wallet`)
        setFundAmount("")
        setShowAddFundsForm(false)

        // Refresh user data to get updated balance
        const userData = await getCurrentUser()
        if (userData) {
          setUser(userData)
        }

        // Refresh wallet transactions
        const transactionsResult = await getWalletTransactions()
        if (transactionsResult.success) {
          setTransactions(transactionsResult.transactions)
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to add funds")
    } finally {
      setLoading(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Wallet & Banking" text="Manage your wallet balance and payment methods." />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Wallet Balance</CardTitle>
              <CardDescription>Your current balance and recent transactions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-3xl font-bold">${user?.walletBalance?.toFixed(2) || "0.00"}</p>
                  </div>
                </div>
                <div className="flex flex-1 gap-2 sm:justify-end">
                  <Button
                    variant={showAddFundsForm ? "outline" : "default"}
                    onClick={() => setShowAddFundsForm(!showAddFundsForm)}
                  >
                    {showAddFundsForm ? "Cancel" : "Add Funds"}
                  </Button>
                  <Button variant="outline">Withdraw</Button>
                </div>
              </div>

              {showAddFundsForm && (
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Add Funds to Wallet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="amount"
                            placeholder="0.00"
                            className="pl-9"
                            value={fundAmount}
                            onChange={(e) => setFundAmount(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Payment Method</Label>
                        <RadioGroup
                          defaultValue="bank"
                          className="grid grid-cols-2 gap-4"
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                        >
                          <div>
                            <RadioGroupItem value="bank" id="bank-deposit" className="peer sr-only" />
                            <Label
                              htmlFor="bank-deposit"
                              className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <CreditCard className="mb-2 h-6 w-6" />
                              <span className="text-sm font-medium">Bank Account</span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="card" id="card-deposit" className="peer sr-only" />
                            <Label
                              htmlFor="card-deposit"
                              className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              <CreditCard className="mb-2 h-6 w-6" />
                              <span className="text-sm font-medium">Credit Card</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {paymentMethod === "bank" && (
                        <div className="grid gap-2">
                          <Label>Select Bank Account</Label>
                          <RadioGroup
                            defaultValue="default"
                            className="space-y-2"
                            value={selectedPaymentSource}
                            onValueChange={setSelectedPaymentSource}
                          >
                            {bankAccounts.length > 0 ? (
                              bankAccounts.map((account, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <RadioGroupItem
                                    value={account._id?.toString() || index.toString()}
                                    id={`bank-${index}`}
                                  />
                                  <Label htmlFor={`bank-${index}`} className="flex-1">
                                    {account.accountName} ({account.accountNumber})
                                  </Label>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No bank accounts added. Please add a bank account first.
                              </div>
                            )}
                          </RadioGroup>
                        </div>
                      )}

                      {paymentMethod === "card" && (
                        <div className="grid gap-2">
                          <Label>Select Credit Card</Label>
                          <RadioGroup
                            defaultValue="default"
                            className="space-y-2"
                            value={selectedPaymentSource}
                            onValueChange={setSelectedPaymentSource}
                          >
                            {creditCards.length > 0 ? (
                              creditCards.map((card, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <RadioGroupItem
                                    value={card._id?.toString() || index.toString()}
                                    id={`card-${index}`}
                                  />
                                  <Label htmlFor={`card-${index}`} className="flex-1">
                                    {card.brand} ending in {card.last4}
                                  </Label>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No credit cards added. Please add a credit card first.
                              </div>
                            )}
                          </RadioGroup>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={handleAddFunds}
                      disabled={
                        loading ||
                        !fundAmount ||
                        isNaN(Number.parseFloat(fundAmount)) ||
                        Number.parseFloat(fundAmount) <= 0 ||
                        (paymentMethod === "bank" && bankAccounts.length === 0) ||
                        (paymentMethod === "card" && creditCards.length === 0)
                      }
                    >
                      {loading ? "Processing..." : "Add Funds"}
                    </Button>
                  </CardFooter>
                </Card>
              )}

              <div>
                <h3 className="mb-4 text-lg font-medium">Recent Activity</h3>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transaction history yet. Add funds to your wallet to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              transaction.type === "deposit"
                                ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                            }`}
                          >
                            {transaction.type === "deposit" ? (
                              <ArrowDownLeft className="h-5 w-5" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                          </div>
                        </div>
                        <p
                          className={`text-lg font-semibold ${
                            transaction.type === "deposit"
                              ? "text-green-600 dark:text-green-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {transaction.type === "deposit" ? "+" : "-"}${transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trust Score</CardTitle>
              <CardDescription>Your reputation on the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center">
                <div className="relative mb-4 flex h-32 w-32 items-center justify-center">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle className="stroke-muted" cx="50" cy="50" r="45" fill="none" strokeWidth="10" />
                    <circle
                      className="stroke-primary"
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      strokeWidth="10"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * (user?.trustScore || 0)) / 5}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">{user?.trustScore?.toFixed(1) || "0.0"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`h-5 w-5 ${i < Math.floor(user?.trustScore || 0) ? "fill-primary" : "fill-muted stroke-muted"}`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Based on your transaction history and platform activity
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Successful Transactions</span>
                    <span className="font-medium">8/10</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>On-time Payments</span>
                    <span className="font-medium">95%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Dispute Resolution</span>
                    <span className="font-medium">100%</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bank-accounts">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
            <TabsTrigger value="cards">Credit Cards</TabsTrigger>
          </TabsList>

          <TabsContent value="bank-accounts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Your Bank Accounts</h3>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setShowAddBankForm(!showAddBankForm)}
              >
                <Plus className="h-4 w-4" />
                {showAddBankForm ? "Cancel" : "Add Bank Account"}
              </Button>
            </div>

            {showAddBankForm && (
              <Card>
                <form action={handleAddBankAccount}>
                  <CardHeader>
                    <CardTitle>Add Bank Account</CardTitle>
                    <CardDescription>Enter your bank account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && <div className="bg-destructive/15 p-3 rounded-md text-sm text-destructive">{error}</div>}

                    <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type</Label>
                      <RadioGroup defaultValue="checking" name="accountType" className="flex space-x-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="checking" id="checking" />
                          <Label htmlFor="checking">Checking</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="savings" id="savings" />
                          <Label htmlFor="savings">Savings</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input id="accountName" name="accountName" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input id="accountNumber" name="accountNumber" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input id="routingNumber" name="routingNumber" required />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        name="isDefault"
                        value="true"
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isDefault">Set as default payment method</Label>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Adding..." : "Add Bank Account"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            )}

            <div className="grid gap-4">
              {bankAccounts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="mb-4 rounded-full bg-muted p-3">
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No bank accounts added yet</p>
                    {!showAddBankForm && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddBankForm(true)}>
                        <Plus className="h-4 w-4" />
                        Add Bank Account
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                bankAccounts.map((account, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="h-2 bg-primary" />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{account.accountName}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)} •{" "}
                            {account.accountNumber}
                          </p>
                        </div>
                        {account.isDefault && (
                          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            Default
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Your Credit Cards</h3>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setShowAddCardForm(!showAddCardForm)}
              >
                <Plus className="h-4 w-4" />
                {showAddCardForm ? "Cancel" : "Add Credit Card"}
              </Button>
            </div>

            {showAddCardForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Credit Card</CardTitle>
                  <CardDescription>Enter your credit card details</CardDescription>
                </CardHeader>
                <CardContent>
                  <CreditCardForm onSubmit={handleAddCreditCard} loading={loading} />
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {creditCards.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <div className="mb-4 rounded-full bg-muted p-3">
                      <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">No credit cards added yet</p>
                    {!showAddCardForm && (
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddCardForm(true)}>
                        <Plus className="h-4 w-4" />
                        Add Credit Card
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                creditCards.map((card, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div
                      className={`h-2 ${
                        card.brand === "visa"
                          ? "bg-blue-500"
                          : card.brand === "mastercard"
                            ? "bg-red-500"
                            : card.brand === "amex"
                              ? "bg-green-500"
                              : "bg-primary"
                      }`}
                    />
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{card.brand.charAt(0).toUpperCase() + card.brand.slice(1)}</p>
                          <p className="text-sm text-muted-foreground">
                            •••• •••• •••• {card.last4} | Expires: {card.expMonth}/{card.expYear}
                          </p>
                        </div>
                        {card.isDefault && (
                          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            Default
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}

