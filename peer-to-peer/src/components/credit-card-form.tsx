"use client"

import type React from "react"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CreditCardFormProps {
  onSubmit: (formData: FormData) => Promise<void>
  loading: boolean
}

export function CreditCardForm({ onSubmit, loading }: CreditCardFormProps) {
  const [isDefault, setIsDefault] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append("isDefault", isDefault.toString())
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardholderName">Cardholder Name</Label>
          <Input id="cardholderName" name="cardholderName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number</Label>
          <Input id="cardNumber" name="cardNumber" type="number" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expMonth">Expiration Month</Label>
            <Input id="expMonth" name="expMonth" type="number" placeholder="MM" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expYear">Expiration Year</Label>
            <Input id="expYear" name="expYear" type="number" placeholder="YYYY" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cvc">CVC</Label>
          <Input id="cvc" name="cvc" type="number" required />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isDefault"
            name="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="isDefault">Set as default payment method</Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Adding..." : "Add Credit Card"}
        </Button>
      </CardFooter>
    </form>
  )
}

