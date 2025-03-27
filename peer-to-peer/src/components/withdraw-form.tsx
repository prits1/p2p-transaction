"use client"

import type React from "react"

import { useState } from "react"
import { ArrowDownLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { withdrawFromWallet } from "@/lib/actions/payment-actions"

interface WithdrawFormProps {
  walletBalance: number
  bankAccounts: any[]
  onSuccess: () => void
  onCancel: () => void
}

export function WithdrawForm({ walletBalance, bankAccounts, onSuccess, onCancel }: WithdrawFormProps) {
  const [amount, setAmount] = useState<string>("")
  const [selectedAccount, setSelectedAccount] = useState<string>(
    bankAccounts.length > 0 ? bankAccounts[0]._id.toString() : "",
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers and decimals
    if (/^\d*\.?\d{0,2}$/.test(value) || value === "") {
      setAmount(value)
    }
  }

  const handleWithdraw = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const amountValue = Number.parseFloat(amount)

    if (isNaN(amountValue) || amountValue <= 0) {
      setError("Please enter a valid amount")
      setLoading(false)
      return
    }

    if (amountValue > walletBalance) {
      setError("Withdrawal amount exceeds your wallet balance")
      setLoading(false)
      return
    }

    if (!selectedAccount) {
      setError("Please select a bank account")
      setLoading(false)
      return
    }

    try {
      const result = await withdrawFromWallet(amountValue, "bank", selectedAccount)

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.message || "Withdrawal initiated successfully")
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || "Failed to process withdrawal")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw Funds</CardTitle>
        <CardDescription>Transfer money from your wallet to your bank account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <Label>Available Balance</Label>
          <span className="font-medium">${walletBalance.toFixed(2)}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Withdrawal Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <Input id="amount" placeholder="0.00" className="pl-7" value={amount} onChange={handleAmountChange} />
          </div>
        </div>

        {bankAccounts.length > 0 ? (
          <div className="space-y-2">
            <Label>Select Bank Account</Label>
            <RadioGroup value={selectedAccount} onValueChange={setSelectedAccount} className="space-y-2">
              {bankAccounts.map((account) => (
                <div key={account._id.toString()} className="flex items-center space-x-2 rounded-md border p-3">
                  <RadioGroupItem value={account._id.toString()} id={`account-${account._id.toString()}`} />
                  <Label htmlFor={`account-${account._id.toString()}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{account.accountName}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)} •{" "}
                      {account.accountNumber}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ) : (
          <Alert>
            <AlertTitle>No Bank Accounts</AlertTitle>
            <AlertDescription>You need to add a bank account before you can withdraw funds.</AlertDescription>
          </Alert>
        )}

        <div className="rounded-md bg-muted p-3">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium">Processing Time:</span> 1-3 business days
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleWithdraw}
          disabled={
            loading ||
            !amount ||
            isNaN(Number.parseFloat(amount)) ||
            Number.parseFloat(amount) <= 0 ||
            Number.parseFloat(amount) > walletBalance ||
            bankAccounts.length === 0
          }
        >
          {loading ? "Processing..." : "Withdraw Funds"}
        </Button>
      </CardFooter>
    </Card>
  )
}

