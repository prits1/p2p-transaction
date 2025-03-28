"use client"

import { useCallback,useEffect, useState } from "react"
import { useRouter, useParams} from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, MessageSquare, ShieldAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { getDisputeById, respondToDispute } from "@/lib/actions/dispute-actions"
import { getCurrentUser } from "@/lib/actions/auth-actions"

export default function DisputeDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string; // ✅ Ensure `id` is treated as a string

  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ✅ Fetch dispute details
  const loadData = useCallback(async () => {
    if (!id) return; // Prevent API calls if id is empty

    setLoading(true);
    try {
      const userData = await getCurrentUser();
      setCurrentUser(userData);

      const result = await getDisputeById(id);
      if (result.success) {
        setDispute(result.dispute);
      } else {
        throw new Error(result.error || "Failed to load dispute");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]); // ✅ Only call when id is available

  // ✅ Handle response submission
  const handleSubmitResponse = async () => {
    if (!responseText.trim() || !id) return;

    setSubmitting(true);
    try {
      const result = await respondToDispute(id, responseText);
      if (!result.success) throw new Error(result.error || "Failed to submit response");

      setResponseText("");
      await loadData(); // Refresh data after submitting response
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setSubmitting(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900"
          >
            Open
          </Badge>
        )
      case "under_review":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900"
          >
            Under Review
          </Badge>
        )
      case "resolved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-900"
          >
            Resolved
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Dispute Details" text="Loading dispute information...">
          <Link href="/dashboard/disputes">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Disputes
            </Button>
          </Link>
        </DashboardHeader>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading dispute details...</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (error || !dispute) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Dispute Details" text="Error loading dispute">
          <Link href="/dashboard/disputes">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Disputes
            </Button>
          </Link>
        </DashboardHeader>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Failed to load dispute"}</AlertDescription>
        </Alert>
      </DashboardShell>
    )
  }

  const isRaisedByCurrentUser = dispute.raisedBy === currentUser?.userId
  const transaction = dispute.transaction
  const userRole = transaction.buyer.userId === currentUser?.userId ? "buyer" : "seller"
  const counterparty = userRole === "buyer" ? transaction.seller : transaction.buyer

  return (
    <DashboardShell>
      <DashboardHeader
        heading={`Dispute #${dispute._id.substring(0, 8)}`}
        text={`For transaction: ${transaction.title}`}
      >
        <Link href="/dashboard/disputes">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Disputes
          </Button>
        </Link>
      </DashboardHeader>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
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
                  <CardTitle>Dispute Information</CardTitle>
                  <CardDescription>Details about this dispute</CardDescription>
                </div>
                {getStatusBadge(dispute.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transaction Amount</p>
                  <p className="text-lg font-semibold">
                    ${transaction.amount.toFixed(2)} {transaction.currency.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dispute Opened</p>
                  <p>{new Date(dispute.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground">Dispute Reason</p>
                <p className="mt-1">{dispute.reason}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground">Raised By</p>
                <p className="mt-1 font-medium">
                  {isRaisedByCurrentUser
                    ? "You"
                    : dispute.raisedBy === transaction.buyer.userId
                      ? transaction.buyer.name
                      : transaction.seller.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dispute.raisedBy === transaction.buyer.userId ? "Buyer" : "Seller"}
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground">Transaction Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900"
                  >
                    Disputed
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Funds are held in escrow until the dispute is resolved
                  </p>
                </div>
              </div>

              {dispute.resolution && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resolution</p>
                    <p className="mt-1">{dispute.resolution}</p>
                    {dispute.resolvedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved on {new Date(dispute.resolvedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="w-full">
                {dispute.status === "open" && (
                  <Alert className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Dispute In Progress</AlertTitle>
                    <AlertDescription>
                      This dispute is currently being reviewed. Please provide any additional information that might
                      help resolve the issue.
                    </AlertDescription>
                  </Alert>
                )}

                {dispute.status === "under_review" && (
                  <Alert className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Under Review</AlertTitle>
                    <AlertDescription>
                      Our support team is currently reviewing this dispute. We'll contact you soon with updates.
                    </AlertDescription>
                  </Alert>
                )}

                {dispute.status === "resolved" && (
                  <Alert className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Dispute Resolved</AlertTitle>
                    <AlertDescription>This dispute has been resolved. {dispute.resolution}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>Information about the disputed transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                  <p className="font-mono">#{transaction._id.substring(0, 8)}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Buyer</p>
                <p className="mt-1 font-medium">
                  {transaction.buyer.userId === currentUser?.userId ? "You" : transaction.buyer.name}
                </p>
                <p className="text-sm text-muted-foreground">{transaction.buyer.email}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm font-medium text-muted-foreground">Seller</p>
                <p className="mt-1 font-medium">
                  {transaction.seller.userId === currentUser?.userId ? "You" : transaction.seller.name}
                </p>
                <p className="text-sm text-muted-foreground">{transaction.seller.email}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Communication</CardTitle>
              <CardDescription>Messages related to this dispute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium">
                    {isRaisedByCurrentUser
                      ? "You"
                      : dispute.raisedBy === transaction.buyer.userId
                        ? transaction.buyer.name
                        : transaction.seller.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(dispute.createdAt).toLocaleString()}</p>
                </div>
                <p>{dispute.reason}</p>
              </div>

              {/* Display dispute messages here */}
              {dispute.messages &&
                dispute.messages.map((message: any, index: number) => (
                  <div
                    key={index}
                    className={`flex flex-col p-3 rounded-lg ${
                      message.sender === currentUser?.userId ? "bg-primary/10 ml-6" : "bg-muted mr-6"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium">{message.senderName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(message.timestamp).toLocaleString()}</p>
                    </div>
                    <p>{message.content}</p>
                  </div>
                ))}

              {dispute.status !== "resolved" && (
                <div className="space-y-4 mt-6">
                  <Textarea
                    placeholder="Type your response here..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button
                    className="w-full gap-2"
                    onClick={handleSubmitResponse}
                    disabled={!responseText.trim() || submitting}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {submitting ? "Sending..." : "Send Response"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence & Documents</CardTitle>
              <CardDescription>Upload evidence to support your case</CardDescription>
            </CardHeader>
            <CardContent>
              {dispute.status !== "resolved" ? (
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <p className="text-muted-foreground">Drag and drop files or click to upload</p>
                    <Button size="sm" className="mt-2">
                      Upload Evidence
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  This dispute has been resolved. No further evidence can be uploaded.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}

