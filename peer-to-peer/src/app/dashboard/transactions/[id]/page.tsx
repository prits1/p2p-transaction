"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Clock, MessageSquare, ShieldAlert, ShieldCheck, AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { getTransaction, releaseEscrowFunds, createDispute } from "@/lib/actions/transaction-actions"
import { getMessages, sendMessage } from "@/lib/actions/message-actions"
import { createPaymentIntent } from "@/lib/actions/payment-actions"
import { PaymentModal } from "@/components/payment-modal"

export default function TransactionDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [transaction, setTransaction] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [userRole, setUserRole] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)

  useEffect(() => {
    async function loadTransaction() {
      const result = await getTransaction(params.id)
      if (result.error) {
        setError(result.error)
        return
      }

      setTransaction(result.transaction)
      setUserRole(result.userRole)
    }

    async function loadMessages() {
      const result = await getMessages(params.id)
      if (result.error) {
        return
      }

      setMessages(result.messages)
    }

    loadTransaction()
    loadMessages()
  }, [params.id])

  async function handleReleaseEscrow() {
    setLoading(true)
    setError(null)

    try {
      const result = await releaseEscrowFunds(params.id)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Refresh transaction data
      const updatedTransaction = await getTransaction(params.id)
      setTransaction(updatedTransaction.transaction)
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  async function handleDisputeTransaction() {
    setLoading(true)
    setError(null)

    const reason = prompt("Please provide a reason for the dispute:")
    if (!reason) {
      setLoading(false)
      return
    }

    try {
      const result = await createDispute(params.id, reason)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // Refresh transaction data
      const updatedTransaction = await getTransaction(params.id)
      setTransaction(updatedTransaction.transaction)
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return

    try {
      const result = await sendMessage(params.id, messageText)

      if (result.error) {
        setError(result.error)
        return
      }

      // Refresh messages
      const messagesResult = await getMessages(params.id)
      setMessages(messagesResult.messages)
      setMessageText("")
    } catch (err) {
      setError("Failed to send message")
    }
  }

  async function handleFundEscrow() {
    if (!transaction) return

    try {
      const result = await createPaymentIntent(transaction.amount, transaction.currency)

      if (result.error) {
        setError(result.error)
        return
      }

      setClientSecret(result.clientSecret!)
      setPaymentIntentId(result.paymentIntentId!)
      setShowPaymentModal(true)
    } catch (err) {
      setError("Failed to initialize payment")
    }
  }

  const getStatusBadge = () => {
    if (!transaction) return null

    switch (transaction.status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        )
      case "active":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Active
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        )
      case "disputed":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Disputed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (!transaction) {
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
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <p>Loading transaction details...</p>
            )}
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <DashboardHeader heading={`Transaction #${transaction._id.substring(0, 8)}`} text={transaction.title}>
        <Link href="/dashboard/transactions">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Transactions
          </Button>
        </Link>
      </DashboardHeader>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-7">
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Transaction Details</CardTitle>
                  <CardDescription>Information about this transaction</CardDescription>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount</p>
                  <p className="text-lg font-semibold">
                    ${transaction.amount.toFixed(2)} {transaction.currency.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created On</p>
                  <p>{new Date(transaction.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="mt-1">{transaction.description}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground">{userRole === "buyer" ? "Seller" : "Buyer"}</p>
                <p className="mt-1 font-medium">
                  {userRole === "buyer" ? transaction.seller.name : transaction.buyer.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {userRole === "buyer" ? transaction.seller.email : transaction.buyer.email}
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p className="mt-1 capitalize">{transaction.paymentMethod.type}</p>
                {transaction.paymentMethod.details && (
                  <p className="text-sm text-muted-foreground">{transaction.paymentMethod.details}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              {transaction.status === "pending" && userRole === "buyer" && (
                <Button className="gap-1 w-full" onClick={handleFundEscrow} disabled={loading}>
                  <CheckCircle className="h-4 w-4" />
                  Fund Escrow
                </Button>
              )}

              {transaction.status === "active" && (
                <>
                  <Button
                    variant="outline"
                    className="gap-1 text-amber-600"
                    onClick={handleDisputeTransaction}
                    disabled={loading}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Raise Dispute
                  </Button>

                  {userRole === "buyer" && (
                    <Button className="gap-1" onClick={handleReleaseEscrow} disabled={loading}>
                      <CheckCircle className="h-4 w-4" />
                      Release Escrow
                    </Button>
                  )}
                </>
              )}

              {transaction.status === "completed" && (
                <div className="w-full">
                  <Alert className="bg-green-50 text-green-700 border-green-200">
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>Transaction Completed</AlertTitle>
                    <AlertDescription>
                      This transaction has been successfully completed and funds have been released to the seller.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {transaction.status === "disputed" && (
                <div className="w-full">
                  <Alert className="bg-amber-50 text-amber-700 border-amber-200">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Dispute In Progress</AlertTitle>
                    <AlertDescription>
                      This transaction is currently under review by our support team. We'll contact you soon.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Timeline</CardTitle>
              <CardDescription>History of events for this transaction</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {transaction.timeline.map((item: any, index: number) => (
                  <li key={index} className="flex gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{item.event}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="messages">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="files">Files & Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Communication</CardTitle>
                  <CardDescription>Messages between you and the counterparty</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex flex-col p-3 rounded-lg ${
                          message.sender === transaction[userRole].userId ? "bg-primary/10 ml-6" : "bg-muted mr-6"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-medium">{message.senderName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <p>{message.content}</p>
                      </div>
                    ))
                  )}
                </CardContent>
                <CardFooter>
                  <div className="space-y-4 w-full">
                    <Textarea
                      placeholder="Type your message here..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                    />
                    <Button className="w-full gap-2" onClick={handleSendMessage} disabled={!messageText.trim()}>
                      <MessageSquare className="h-4 w-4" />
                      Send Message
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>Files & Documents</CardTitle>
                  <CardDescription>Shared files related to this transaction</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <div className="text-center">
                      <p className="text-muted-foreground">No files uploaded yet</p>
                      <Button size="sm" className="mt-2">
                        Upload File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showPaymentModal && clientSecret && (
        <PaymentModal
          clientSecret={clientSecret}
          paymentIntentId={paymentIntentId!}
          transactionId={params.id}
          amount={transaction.amount}
          currency={transaction.currency}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false)
            router.refresh()
          }}
        />
      )}
    </DashboardShell>
  )
}

