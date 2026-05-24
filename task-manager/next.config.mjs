/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Package import optimisation ──────────────────────────────────────────
  // Tells Turbopack (and webpack) to only bundle the specific named exports
  // that are actually imported from these large packages, instead of processing
  // the entire library.  react-icons is 84 MB on disk; without this flag every
  // icon set (md, fa, hi, io, …) is parsed during compilation even if only
  // one set is used.  chart.js has a similar barrel-export problem.
  experimental: {
    optimizePackageImports: ['react-icons', 'chart.js', 'react-chartjs-2'],
  },

  // ─── Dev-server page buffer ────────────────────────────────────────────────
  // onDemandEntries controls how many compiled pages Next.js keeps warm in
  // memory between requests.  The defaults (60 s / 5 pages) are conservative;
  // lowering them reduces RAM pressure on a laptop without hurting DX because
  // pages recompile on demand anyway.
  onDemandEntries: {
    maxInactiveAge: 20 * 1000, // evict pages after 20 s of inactivity (default 60 s)
    pagesBufferLength: 3,      // keep at most 3 pages compiled in memory (default 5)
  },
};

export default nextConfig;
