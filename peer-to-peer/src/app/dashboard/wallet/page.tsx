"use client"

import { useState, useEffect } from "react"
import { CreditCard, Plus, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { addBankAccount, getBankAccounts } from "@/lib/actions/payment-actions"
import { getCurrentUser } from "@/lib/actions/auth-actions"

export default function WalletPage() {
  const [user, setUser] = useState<any>(null)
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [showAddBankForm, setShowAddBankForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const userData = await getCurrentUser()
      if (userData) {
        setUser(userData)
      }

      const accountsResult = await getBankAccounts()
      if (accountsResult.success) {
        setBankAccounts(accountsResult.bankAccounts)
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
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Wallet & Banking" text="Manage your wallet balance and payment methods." />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Balance</CardTitle>
            <CardDescription>Your current balance and recent transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-3xl font-bold">${user?.walletBalance?.toFixed(2) || "0.00"}</p>
              </div>
              <Button className="ml-auto">Add Funds</Button>
            </div>
          </CardContent>
        </Card>

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
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{account.accountName}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)} •{" "}
                            {account.accountNumber}
                          </p>
                        </div>
                        {account.isDefault && (
                          <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
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
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Credit Card
              </Button>
            </div>

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <p className="text-muted-foreground mb-4">No credit cards added yet</p>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Credit Card
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}

