import type React from "react"

interface DashboardShellProps {
  children: React.ReactNode
  className?: string
}

export function DashboardShell({ children, className = "" }: DashboardShellProps) {
  return (
    <div className={`flex min-h-full flex-col ${className}`}>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
    </div>
  )
}



