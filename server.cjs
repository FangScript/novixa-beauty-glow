// server.cjs — CJS wrapper for LiteSpeed/Passenger compatibility
// LiteSpeed's lsnode.js uses require() which cannot load ES modules.
// This CJS shim uses dynamic import() to bridge into the ESM server.js.
'use strict';

(async () => {
  try {
    await import('./server.js');
  } catch (err) {
    console.error('[novixa] Failed to start Next.js server:', err);
    process.exit(1);
  }
})();
