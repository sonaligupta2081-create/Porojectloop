/** @type {import('next').NextConfig} */
//
// The frontend-only build had a rewrite here proxying /api/:path* to a
// hardcoded http://localhost:3000/api/:path* -- a placeholder for "the
// backend" that would have broken any deployment not running on that
// exact host/port. Now that the API routes live in this same Next.js
// app (app/api/**), no rewrite is needed at all: requests to /api/*
// are just handled locally.
const nextConfig = {};

export default nextConfig;
