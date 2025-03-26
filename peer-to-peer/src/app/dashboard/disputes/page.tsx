"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { getDisputes } from "@/lib/actions/dispute-actions"

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDisputes() {
      setLoading(true)
      try {
        const result = await getDisputes()
        if (result.success) {
          setDisputes(result.disputes)
        } else {
          setError(result.error || "Failed to load disputes")
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    loadDisputes()
  }, [])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "under_review":
        return <Clock className="h-5 w-5 text-amber-500" />
      case "resolved":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  return (
    <DashboardShell>
      <DashboardHeader heading="Disputes" text="Manage and track disputes for your transactions." />

      <Tabs defaultValue="all">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Disputes</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Disputes</CardTitle>
              <CardDescription>View all disputes related to your transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading disputes...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>{error}</p>
                </div>
              ) : disputes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">You don't have any disputes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {disputes.map((dispute) => (
                    <Link
                      key={dispute._id}
                      href={`/dashboard/disputes/${dispute._id}`}
                      className="block transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            {getStatusIcon(dispute.status)}
                          </div>
                          <div>
                            <p className="font-medium">
                              Dispute for Transaction #{dispute.transaction._id.substring(0, 8)}
                            </p>
                            <p className="text-sm text-muted-foreground">{dispute.transaction.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Opened on {new Date(dispute.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(dispute.status)}
                          <p className="text-sm font-medium">${dispute.transaction.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="open" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Open Disputes</CardTitle>
              <CardDescription>Disputes that require attention</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading disputes...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {disputes
                    .filter((dispute) => dispute.status === "open" || dispute.status === "under_review")
                    .map((dispute) => (
                      <Link
                        key={dispute._id}
                        href={`/dashboard/disputes/${dispute._id}`}
                        className="block transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              {getStatusIcon(dispute.status)}
                            </div>
                            <div>
                              <p className="font-medium">
                                Dispute for Transaction #{dispute.transaction._id.substring(0, 8)}
                              </p>
                              <p className="text-sm text-muted-foreground">{dispute.transaction.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Opened on {new Date(dispute.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(dispute.status)}
                            <Button size="sm">
                              View Details
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  {disputes.filter((dispute) => dispute.status === "open" || dispute.status === "under_review")
                    .length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">You don't have any open disputes</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resolved Disputes</CardTitle>
              <CardDescription>Disputes that have been resolved</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading disputes...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {disputes
                    .filter((dispute) => dispute.status === "resolved")
                    .map((dispute) => (
                      <Link
                        key={dispute._id}
                        href={`/dashboard/disputes/${dispute._id}`}
                        className="block transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between rounded-lg border p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <p className="font-medium">
                                Dispute for Transaction #{dispute.transaction._id.substring(0, 8)}
                              </p>
                              <p className="text-sm text-muted-foreground">{dispute.transaction.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Resolved on{" "}
                                {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleDateString() : "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(dispute.status)}
                            <p className="text-sm font-medium">${dispute.transaction.amount.toFixed(2)}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  {disputes.filter((dispute) => dispute.status === "resolved").length === 0 && (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">You don't have any resolved disputes</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}

