import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import * as jose from "jose"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Only apply to dashboard routes, allow reset-password routes to pass through
  if (!path.startsWith("/dashboard") || path.startsWith("/reset-password")) {
    return NextResponse.next()
  }

  try {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      console.log("Middleware: No auth token found, redirecting to login")
      return NextResponse.redirect(new URL("/login", request.url))
    }

    try {
      // Verify the token
      const JWT_SECRET = process.env.JWT_SECRET || "local-development-secret-key-change-in-production"
      const secret = new TextEncoder().encode(JWT_SECRET)
      await jose.jwtVerify(token, secret)
      console.log("Middleware: Token verified successfully")
      return NextResponse.next()
    } catch (error) {
      console.error("Middleware: Token verification failed:", error)
      // Clear the invalid token
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete("auth-token")
      return response
    }
  } catch (error) {
    console.error("Middleware error:", error)
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/reset-password/:path*"],
}


