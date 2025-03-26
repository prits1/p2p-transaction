"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle,
  Clock,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Wallet,
  ArrowLeftRight,
  LockIcon,
  Star,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { releaseEscrowFunds, createDispute, fundEscrowFromWallet } from "@/lib/actions/transaction-actions"
import { sendMessage } from "@/lib/actions/message-actions"
import { createPaymentIntent } from "@/lib/actions/payment-actions"
import { PaymentModal } from "@/components/payment-modal"
import { ReviewForm } from "@/components/review-form"
import { getCurrentUser } from "@/lib/actions/auth-actions"

export function TransactionClient({
  transaction,
  userRole,
  initialMessages,
  transactionId,
}: {
  transaction: any
  userRole: string
  initialMessages: any[]
  transactionId: string
}) {
  const router = useRouter()
  const [messages, setMessages] = useState(initialMessages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messageText, setMessageText] = useState("")
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [checkingWallet, setCheckingWallet] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  async function handleReleaseEscrow() {
    setLoading(true)
    setError(null)

    try {
      const result = await releaseEscrowFunds(transactionId)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.refresh()
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
      const result = await createDispute(transactionId, reason)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.refresh()
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return

    try {
      const result = await sendMessage(transactionId, messageText)

      if (result.error) {
        setError(result.error)
        return
      }

      // Add the new message to the local state
      const newMessage = {
        _id: Date.now().toString(), // Temporary ID
        transactionId,
        sender: transaction[userRole].userId,
        senderName: transaction[userRole].name,
        content: messageText,
        timestamp: new Date(),
        isRead: false,
      }

      setMessages([...messages, newMessage])
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

  async function checkWalletBalance() {
    setCheckingWallet(true)
    try {
      const user = await getCurrentUser()
      if (user) {
        setWalletBalance(user.walletBalance)
      }
    } catch (err) {
      console.error("Failed to get wallet balance", err)
    } finally {
      setCheckingWallet(false)
    }
  }

  async function handleFundFromWallet() {
    setLoading(true)
    setError(null)

    try {
      const result = await fundEscrowFromWallet(transactionId)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.refresh()
      setLoading(false)
    } catch (err) {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (!transaction) return null

    switch (transaction.status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-900"
          >
            Pending
          </Badge>
        )
      case "active":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900"
          >
            Active
          </Badge>
        )
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900"
          >
            Completed
          </Badge>
        )
      case "disputed":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900"
          >
            Disputed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900"
          >
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Determine if the user can leave a review
  const canLeaveReview = transaction.status === "completed" && !transaction.hasReviewed?.[userRole]
  const counterpartyId = userRole === "buyer" ? transaction.seller.userId : transaction.buyer.userId
  const counterpartyName = userRole === "buyer" ? transaction.seller.name : transaction.buyer.name

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Escrow Status Card - New Component */}
      {transaction.status !== "pending" && (
        <Card className="mb-6 overflow-hidden">
          <div
            className={`h-1.5 w-full ${
              transaction.status === "completed"
                ? "bg-green-500"
                : transaction.status === "disputed"
                  ? "bg-amber-500"
                  : "bg-blue-500"
            }`}
          />
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    transaction.status === "completed"
                      ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : transaction.status === "disputed"
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                        : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  }`}
                >
                  {transaction.status === "completed" ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : transaction.status === "disputed" ? (
                    <ShieldAlert className="h-6 w-6" />
                  ) : (
                    <LockIcon className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium">Escrow Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {transaction.status === "completed"
                      ? "Funds have been released to the seller"
                      : transaction.status === "disputed"
                        ? "Transaction is under dispute resolution"
                        : "Funds are securely held in escrow"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {userRole === "buyer" ? "You" : transaction.buyer.name} →{" "}
                    {userRole === "seller" ? "You" : transaction.seller.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">${transaction.amount.toFixed(2)}</span>
                  {getStatusBadge()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="mb-6">
          <ReviewForm
            transactionId={transactionId}
            revieweeId={counterpartyId}
            revieweeName={counterpartyName}
            onSuccess={() => {
              setShowReviewForm(false)
              router.refresh()
            }}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      {/* Review CTA */}
      {canLeaveReview && !showReviewForm && (
        <Card className="mb-6 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Leave a Review</h3>
                  <p className="text-sm text-muted-foreground">Share your experience with {counterpartyName}</p>
                </div>
              </div>
              <Button onClick={() => setShowReviewForm(true)}>Write Review</Button>
            </div>
          </CardContent>
        </Card>
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
            <CardFooter className="flex flex-col gap-4">
              {transaction.status === "pending" && userRole === "buyer" && (
                <div className="w-full space-y-4">
                  {walletBalance === null ? (
                    <Button
                      variant="outline"
                      className="gap-1 w-full"
                      onClick={checkWalletBalance}
                      disabled={checkingWallet}
                    >
                      <Wallet className="h-4 w-4" />
                      {checkingWallet ? "Checking wallet..." : "Check Wallet Balance"}
                    </Button>
                  ) : walletBalance >= transaction.amount ? (
                    <div className="space-y-2">
                      <Alert className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        <Wallet className="h-4 w-4" />
                        <AlertTitle>Wallet Balance Available</AlertTitle>
                        <AlertDescription>
                          You have ${walletBalance.toFixed(2)} in your wallet, which is enough to fund this transaction.
                        </AlertDescription>
                      </Alert>
                      <div className="flex gap-2">
                        <Button className="gap-1 flex-1" onClick={handleFundFromWallet} disabled={loading}>
                          <Wallet className="h-4 w-4" />
                          Fund from Wallet
                        </Button>
                        <Button className="gap-1 flex-1" onClick={handleFundEscrow} disabled={loading}>
                          <CheckCircle className="h-4 w-4" />
                          Fund with Card/Bank
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Insufficient Wallet Balance</AlertTitle>
                        <AlertDescription>
                          Your wallet balance (${walletBalance.toFixed(2)}) is not enough to fund this transaction ($
                          {transaction.amount.toFixed(2)}).
                        </AlertDescription>
                      </Alert>
                      <Button className="gap-1 w-full" onClick={handleFundEscrow} disabled={loading}>
                        <CheckCircle className="h-4 w-4" />
                        Fund Escrow with Card/Bank
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {transaction.status === "active" && (
                <div className="w-full flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-1 text-amber-600 flex-1"
                    onClick={handleDisputeTransaction}
                    disabled={loading}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Raise Dispute
                  </Button>

                  {userRole === "buyer" && (
                    <Button className="gap-1 flex-1" onClick={handleReleaseEscrow} disabled={loading}>
                      <CheckCircle className="h-4 w-4" />
                      Release Escrow
                    </Button>
                  )}
                </div>
              )}

              {transaction.status === "completed" && (
                <div className="w-full">
                  <Alert className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
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
                  <Alert className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Dispute In Progress</AlertTitle>
                    <AlertDescription>
                      This transaction is currently under review by our support team. We'll contact you soon.
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => router.push(`/dashboard/disputes/${transaction.disputeId || ""}`)}
                  >
                    View Dispute Details
                  </Button>
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
          transactionId={transactionId}
          amount={transaction.amount}
          currency={transaction.currency}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}


