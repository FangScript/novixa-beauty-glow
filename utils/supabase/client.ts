import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://macpycxntatdcsxvckmr.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_nOsrXBUwXTnAC-jZv_sa6g_BcwTK0QY";

export const createClient = () => createBrowserClient(supabaseUrl, supabaseKey);
