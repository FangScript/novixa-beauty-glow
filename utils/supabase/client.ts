import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://macpycxntatdcsxvckmr.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_nOsrXBUwXTnAC-jZv_sa6g_BcwTK0QY";

let browserClient: SupabaseClient | null = null;

export const createClient = () => {
  if (typeof window === "undefined") {
    return createBrowserClient(supabaseUrl, supabaseKey);
  }
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return browserClient;
};
