/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  reactStrictMode: true,

  // Mount this app under Career Scout at /jobtracker.
  // When running standalone, open http://localhost:<port>/jobtracker
  basePath: "/jobtracker",

  // Next.js 16 defaults to using Turbopack and tries to infer a "workspace root".
  // In this machine, multiple lockfiles exist under C:\Users\nedpe which can confuse that inference.
  turbopack: {
    root: __dirname
  },

  // Prisma (and native deps like better-sqlite3) should not be bundled by the server compiler.
  // Bundling can pick the wrong runtime entrypoints and crash during "Collecting page data".
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg", "pg"],

  // In some restricted environments, spawning `tsc` during `next build` can fail (spawn EPERM).
  // Skipping build-time typechecking keeps `next build` usable here.
  typescript: {
    ignoreBuildErrors: true
  },
  experimental: {
    // Worker threads can fail if build workers try to pass non-cloneable values
    // (e.g. functions) between threads, resulting in DataCloneError.
    // If you hit spawn EPERM after disabling this, re-enable and address the root
    // source of the non-serializable value instead.
    workerThreads: false
  }
};

export default nextConfig;

