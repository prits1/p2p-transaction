"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { TransactionsList } from "@/components/transactions-list"
import { getTransactions } from "@/lib/actions/transaction-actions"

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTransactions() {
      setLoading(true)
      const result = await getTransactions()

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      if (result.transactions) {
        setTransactions(result.transactions)
      } else {
        setTransactions([])
      }
      setLoading(false)
    }

    loadTransactions()
  }, [])

  return (
    <DashboardShell>
      <DashboardHeader heading="Transactions" text="Manage your escrow transactions.">
        <Button asChild>
          <Link href="/dashboard/transactions/new">New Transaction</Link>
        </Button>
      </DashboardHeader>
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>View and manage all your transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading transactions...</div>
          ) : error ? (
            <div className="text-center py-4 text-destructive">{error}</div>
          ) : (
            <TransactionsList transactions={transactions} />
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  )
}

