import Link from "next/link"
import { CheckCircle, Clock, ShieldAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface TransactionsListProps {
  transactions: any[]
  filter?: string
  limit?: number
}

export function TransactionsList({ transactions = [], filter, limit }: TransactionsListProps) {
  // Filter transactions if needed
  let filteredTransactions = transactions
  if (filter === "escrow") {
    filteredTransactions = transactions.filter((t) => t.status === "active")
  }

  // Limit the number of transactions if specified
  if (limit) {
    filteredTransactions = filteredTransactions.slice(0, limit)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Pending
            </Badge>
          </div>
        )
      case "active":
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Active
            </Badge>
          </div>
        )
      case "completed":
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Completed
            </Badge>
          </div>
        )
      case "disputed":
        return (
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Disputed
            </Badge>
          </div>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Counterparty</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredTransactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
              No transactions found
            </TableCell>
          </TableRow>
        ) : (
          filteredTransactions.map((transaction) => (
            <TableRow key={transaction._id}>
              <TableCell className="font-medium">#{transaction._id.substring(0, 8)}</TableCell>
              <TableCell>{transaction.title}</TableCell>
              <TableCell>${transaction.amount.toFixed(2)}</TableCell>
              <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                {transaction.buyer.userId === transaction.seller.userId
                  ? "System"
                  : transaction.buyer.name === transaction.seller.name
                    ? transaction.seller.email
                    : transaction.seller.name}
              </TableCell>
              <TableCell>{getStatusBadge(transaction.status)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/transactions/${transaction._id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

