import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft, AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { getTransaction } from "@/lib/actions/transaction-actions"
import { getMessages } from "@/lib/actions/message-actions"
import { TransactionClient } from "@/components/transaction-client"

// This is a Server Component that fetches data
export default async function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Properly await the params Promise
  const { id } = await params

  return (
    <Suspense fallback={<TransactionLoading />}>
      <TransactionDetails id={id} />
    </Suspense>
  )
}

// Loading component
function TransactionLoading() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Transaction Details" text="Loading transaction information...">
        <Link href="/dashboard/transactions">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Transactions
          </Button>
        </Link>
      </DashboardHeader>
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p>Loading transaction details...</p>
        </div>
      </div>
    </DashboardShell>
  )
}

// Server Component that fetches data
async function TransactionDetails({ id }: { id: string }) {
  const result = await getTransaction(id)
  const messagesResult = await getMessages(id)

  if (result.error) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Transaction Details" text="Error loading transaction">
          <Link href="/dashboard/transactions">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Transactions
            </Button>
          </Link>
        </DashboardHeader>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </DashboardShell>
    )
  }

  const transaction = result.transaction
  const userRole = result.userRole
  const messages = messagesResult.success ? messagesResult.messages : []

  if (!transaction) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Transaction Details" text="Transaction not found">
          <Link href="/dashboard/transactions">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Transactions
            </Button>
          </Link>
        </DashboardHeader>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Transaction not found</AlertDescription>
        </Alert>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <DashboardHeader heading={`Transaction #${transaction._id.substring(0, 8)}`} text="Transaction Details">
        <Link href="/dashboard/transactions">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Transactions
          </Button>
        </Link>
      </DashboardHeader>

      <TransactionClient transaction={transaction} userRole={userRole ?? "defaultRole"} initialMessages={messages} transactionId={id} />
    </DashboardShell>
  )
}



