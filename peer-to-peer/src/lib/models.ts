import type { ObjectId } from "mongodb"

export interface User {
  _id?: ObjectId
  email: string
  password: string // Hashed
  name: string
  role: "buyer" | "seller" | "admin"
  createdAt: Date
  walletBalance: number
  trustScore: number
  bankAccounts?: BankAccount[]
  notifications?: Notification[]
}

export interface Notification {
  _id?: ObjectId
  userId: ObjectId
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  relatedTo?: {
    type: "transaction" | "dispute" | "message" | "system"
    id: string
  }
  isRead: boolean
  createdAt: Date
}

export interface BankAccount {
  _id?: ObjectId
  userId: ObjectId
  accountType: "checking" | "savings" | "credit"
  accountName: string
  accountNumber: string // Last 4 digits only for security
  isDefault: boolean
  createdAt: Date
}

export interface Transaction {
  _id?: ObjectId
  title: string
  description: string
  amount: number
  currency: string
  status: "pending" | "active" | "completed" | "disputed" | "cancelled"
  buyer: {
    userId: ObjectId
    email: string
    name: string
  }
  seller: {
    userId: ObjectId
    email: string
    name: string
  }
  escrowFunded: boolean
  paymentMethod: {
    type: "bank" | "card" | "wallet"
    details: string
  }
  escrowId?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  timeline: {
    date: Date
    event: string
    description: string
  }[]
}

export interface Message {
  _id?: ObjectId
  transactionId: ObjectId
  sender: ObjectId
  senderName: string
  content: string
  timestamp: Date
  isRead: boolean
}

export interface Dispute {
  _id?: ObjectId
  transactionId: ObjectId
  raisedBy: ObjectId
  reason: string
  status: "open" | "under_review" | "resolved"
  resolution?: string
  adminNotes?: string
  createdAt: Date
  resolvedAt?: Date
}

export interface Review {
  _id?: ObjectId
  transactionId: ObjectId
  reviewerId: ObjectId
  revieweeId: ObjectId
  rating: number
  comment: string
  createdAt: Date
}


