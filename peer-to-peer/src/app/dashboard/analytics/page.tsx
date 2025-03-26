"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, ShoppingCart, TrendingUp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { getTransactions } from "@/lib/actions/transaction-actions"
import { getCurrentUser } from "@/lib/actions/auth-actions"

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState("month")

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getCurrentUser()
        if (user) {
          setUserData(user)
        }

        const result = await getTransactions()
        if (result.success) {
          setTransactions(result.transactions)
        } else {
          setError(result.error || "Failed to load transactions")
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [timeframe])

  // Calculate analytics data
  const totalTransactions = transactions.length
  const completedTransactions = transactions.filter((t) => t.status === "completed").length
  const activeTransactions = transactions.filter((t) => t.status === "active").length
  const disputedTransactions = transactions.filter((t) => t.status === "disputed").length

  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0)
  const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0

  // Prepare chart data
  const statusData = [
    { name: "Completed", value: completedTransactions, color: "#10b981" },
    { name: "Active", value: activeTransactions, color: "#3b82f6" },
    { name: "Disputed", value: disputedTransactions, color: "#f59e0b" },
    {
      name: "Pending",
      value: totalTransactions - completedTransactions - activeTransactions - disputedTransactions,
      color: "#6b7280",
    },
  ]

  // Monthly transaction data
  const getMonthlyData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const monthlyData = Array(12)
      .fill(0)
      .map((_, i) => ({
        name: months[i],
        value: 0,
        volume: 0,
      }))

    transactions.forEach((t) => {
      const date = new Date(t.createdAt)
      const month = date.getMonth()
      monthlyData[month].value += 1
      monthlyData[month].volume += t.amount
    })

    return monthlyData
  }

  const monthlyData = getMonthlyData()

  // Weekly transaction data
  const getWeeklyData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const weeklyData = Array(7)
      .fill(0)
      .map((_, i) => ({
        name: days[i],
        value: 0,
        volume: 0,
      }))

    transactions.forEach((t) => {
      const date = new Date(t.createdAt)
      const day = date.getDay()
      weeklyData[day].value += 1
      weeklyData[day].volume += t.amount
    })

    return weeklyData
  }

  const weeklyData = getWeeklyData()

  return (
    <DashboardShell>
      <DashboardHeader heading="Analytics" text="Track your transaction metrics and performance." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalVolume.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">{completedTransactions} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageTransactionValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.trustScore?.toFixed(1) || "0.0"}</div>
            <p className="text-xs text-muted-foreground">
              {userData?.trustScore >= 4.5
                ? "Excellent"
                : userData?.trustScore >= 4.0
                  ? "Very Good"
                  : userData?.trustScore >= 3.0
                    ? "Good"
                    : userData?.trustScore >= 2.0
                      ? "Fair"
                      : "Poor"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="mt-6">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>
        <div className="flex justify-end mt-2">
          <TabsList>
            <TabsTrigger
              value="week"
              onClick={() => setTimeframe("week")}
              data-state={timeframe === "week" ? "active" : "inactive"}
            >
              Week
            </TabsTrigger>
            <TabsTrigger
              value="month"
              onClick={() => setTimeframe("month")}
              data-state={timeframe === "month" ? "active" : "inactive"}
            >
              Month
            </TabsTrigger>
            <TabsTrigger
              value="year"
              onClick={() => setTimeframe("year")}
              data-state={timeframe === "year" ? "active" : "inactive"}
            >
              Year
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Count</CardTitle>
              <CardDescription>Number of transactions over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeframe === "week" ? weeklyData : monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Volume</CardTitle>
              <CardDescription>Total transaction volume over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timeframe === "week" ? weeklyData : monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, "Volume"]} />
                  <Line type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Status</CardTitle>
              <CardDescription>Distribution of transaction statuses</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Success Rate</CardTitle>
            <CardDescription>Percentage of successfully completed transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Completed</span>
              </div>
              <span className="text-sm font-medium">
                {totalTransactions > 0 ? ((completedTransactions / totalTransactions) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                <span className="text-sm">Disputed</span>
              </div>
              <span className="text-sm font-medium">
                {totalTransactions > 0 ? ((disputedTransactions / totalTransactions) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${totalTransactions > 0 ? (disputedTransactions / totalTransactions) * 100 : 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth Metrics</CardTitle>
            <CardDescription>Month-over-month growth in key metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Transaction Volume</span>
              <div className="flex items-center">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-500">+12.5%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Transaction Count</span>
              <div className="flex items-center">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-500">+8.3%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Average Transaction Value</span>
              <div className="flex items-center">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-green-500">+3.7%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Dispute Rate</span>
              <div className="flex items-center">
                <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm font-medium text-red-500">-2.1%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

