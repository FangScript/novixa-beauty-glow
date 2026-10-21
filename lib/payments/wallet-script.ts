interface WalletScriptOptions {
  src: string;
  isReady: () => boolean;
  validateExisting?: (src: string) => void;
  timeoutMs?: number;
}

/** Reuse an in-flight SDK instead of racing React's PayPalScriptProvider. */
export function loadWalletScript({
  src,
  isReady,
  validateExisting,
  timeoutMs = 15000,
}: WalletScriptOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const requested = new URL(src);
    const existing = Array.from(document.scripts).find((script) => {
      if (!script.src) return false;
      const url = new URL(script.src);
      return url.origin === requested.origin && url.pathname === requested.pathname;
    });
    try {
      if (existing) validateExisting?.(existing.src);
      if (isReady()) {
        resolve();
        return;
      }
    } catch (error) {
      reject(error);
      return;
    }
    const script = existing || document.createElement("script");
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      clearTimeout(timeout);
      script.removeEventListener("load", check);
      script.removeEventListener("error", failed);
      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      try {
        if (isReady()) finish();
      } catch {
        finish(new Error(`Payment SDK initialization failed (${requested.hostname}).`));
      }
    };
    const failed = () => finish(new Error(`Payment SDK failed to load (${requested.hostname}).`));
    script.addEventListener("load", check);
    script.addEventListener("error", failed);
    const interval = setInterval(check, 50);
    const timeout = setTimeout(
      () => finish(new Error(`Payment SDK timed out (${requested.hostname}).`)),
      timeoutMs,
    );
    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
    check();
  });
}

export function withWalletTimeout<T>(operation: Promise<T>, message: string, timeoutMs = 15000) {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

export function validatePayPalGooglePayScript(src: string, clientId: string, currency: string) {
  const params = new URL(src).searchParams;
  if (params.get("client-id") !== clientId || (params.get("currency") || "USD") !== currency) {
    throw new Error("The loaded PayPal SDK client ID or currency does not match checkout.");
  }
  if (!(params.get("components") || "buttons").split(",").includes("googlepay")) {
    throw new Error("The loaded PayPal SDK does not include the googlepay component.");
  }
}
