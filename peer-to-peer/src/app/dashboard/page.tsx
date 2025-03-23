import { Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getTransactions } from "@/lib/actions/transaction-actions"
import { getCurrentUser } from "@/lib/actions/auth-actions"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Plus } from "lucide-react"

// Dashboard stats component with suspense
async function DashboardStats() {
  const userData = await getCurrentUser()
  const transactionsData = await getTransactions()

  if (!userData) {
    return <div>Error loading user data</div>
  }

  const transactions = transactionsData.success ? transactionsData.transactions : []

  const activeTransactions = transactions.filter((t: any) => t.status === "active" || t.status === "pending").length
  const completedTransactions = transactions.filter((t: any) => t.status === "completed").length
  const disputedTransactions = transactions.filter((t: any) => t.status === "disputed").length

  // Get recent transactions (up to 3)
  const recentTransactions = transactions.slice(0, 3)

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${userData.walletBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Available for transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Transactions</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTransactions}</div>
            <p className="text-xs text-muted-foreground">Ongoing transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTransactions}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disputes</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disputedTransactions}</div>
            <p className="text-xs text-muted-foreground">Transactions in dispute</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you can perform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/transactions/new" className="block">
              <div className="flex items-center p-2 hover:bg-muted rounded-md cursor-pointer">
                <Plus className="h-4 w-4 mr-2 text-primary" />
                <span>Create New Transaction</span>
              </div>
            </Link>
            <Link href="/dashboard/wallet" className="block">
              <div className="flex items-center p-2 hover:bg-muted rounded-md cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 mr-2 text-primary"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
                <span>Add Bank Account</span>
              </div>
            </Link>
            <Link href="/dashboard/wallet" className="block">
              <div className="flex items-center p-2 hover:bg-muted rounded-md cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 mr-2 text-primary"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span>Deposit Funds</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest transaction activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No transactions yet. Create your first transaction!
              </div>
            ) : (
              recentTransactions.map((transaction: any, index: number) => (
                <Link href={`/dashboard/transactions/${transaction._id}`} key={transaction._id} className="block">
                  <div className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                        {transaction.status === "completed" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-green-600"
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        ) : transaction.status === "disputed" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-amber-600"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-primary"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transaction.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium">${transaction.amount.toFixed(2)}</span>
                  </div>
                </Link>
              ))
            )}

            {recentTransactions.length > 0 && (
              <div className="pt-2">
                <Link href="/dashboard/transactions">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Transactions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trust Score</CardTitle>
            <CardDescription>Your reputation on the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-primary">{userData.trustScore.toFixed(1)}</span>
              </div>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={star < userData.trustScore ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className={`h-5 w-5 ${star < userData.trustScore ? "text-yellow-500" : "text-muted-foreground"}`}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Based on {completedTransactions} completed transactions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Loading skeleton for dashboard stats
function DashboardStatsLoading() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array(3)
                    .fill(0)
                    .map((_, j) => (
                      <Skeleton key={j} className="h-10 w-full" />
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Dashboard" text="Welcome to your P2P transaction dashboard." />
      <Suspense fallback={<DashboardStatsLoading />}>
        <DashboardStats />
      </Suspense>
    </DashboardShell>
  )
}



