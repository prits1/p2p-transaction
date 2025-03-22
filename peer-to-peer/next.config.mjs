/** @type {import('next').NextConfig} */
const nextConfig = {
    // Next.js 15 specific configurations
    logging: {
      fetches: {
        fullUrl: true,
      },
    },
    // Enable server actions explicitly
    experimental: {
      serverActions: {
        allowedOrigins: ["localhost:3000", "127.0.0.1:3000"],
      },
    },
  }
  
  export default nextConfig
  
  