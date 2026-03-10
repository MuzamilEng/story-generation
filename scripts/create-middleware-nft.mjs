/**
 * Vercel's deployment infrastructure expects both:
 *   .next/server/middleware.js
 *   .next/server/middleware.js.nft.json
 * Next.js 16 with Turbopack compiles middleware into edge chunks and doesn't
 * generate these files, causing Vercel's post-build lstat to fail with ENOENT.
 * This script creates both files after the build.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const serverDir = join(root, ".next", "server");

if (!existsSync(serverDir)) {
  mkdirSync(serverDir, { recursive: true });
}

// Read the middleware manifest to get the actual edge chunk paths
const middlewareManifestPath = join(serverDir, "middleware-manifest.json");
let edgeFiles = [];
let edgeChunkFiles = [];

if (existsSync(middlewareManifestPath)) {
  try {
    const manifest = JSON.parse(readFileSync(middlewareManifestPath, "utf-8"));
    const middlewareEntry = manifest?.middleware?.["/"];
    if (middlewareEntry?.files) {
      edgeFiles = middlewareEntry.files;
      edgeChunkFiles = middlewareEntry.files.map((f) => `../${f}`);
    }
  } catch {
    // Fallback to empty list
  }
}

// 1. Create middleware.js stub so Vercel's lstat doesn't fail.
//    It re-exports from the first edge wrapper chunk so the edge runtime can load it.
const middlewareJsPath = join(serverDir, "middleware.js");
if (!existsSync(middlewareJsPath)) {
  // Build a dynamic require chain to the actual edge chunks
  const requireStatements = edgeFiles
    .map((f) => `require("../${f}");`)
    .join("\n");

  const stub = `// Auto-generated stub for Vercel edge middleware compatibility.
// The actual middleware is compiled by Turbopack into edge chunks.
${requireStatements || "// No edge chunks found — middleware may be empty."}
`;
  writeFileSync(middlewareJsPath, stub);
  console.log("✓ Created .next/server/middleware.js for Vercel compatibility");
} else {
  console.log("✓ .next/server/middleware.js already exists");
}

// 2. Create middleware.js.nft.json so Vercel knows which files to trace/bundle.
const nftPath = join(serverDir, "middleware.js.nft.json");
if (!existsSync(nftPath)) {
  const nftContent = {
    version: 1,
    files: edgeChunkFiles,
  };
  writeFileSync(nftPath, JSON.stringify(nftContent, null, 2));
  console.log(
    "✓ Created .next/server/middleware.js.nft.json for Vercel compatibility",
  );
} else {
  console.log("✓ .next/server/middleware.js.nft.json already exists");
}
