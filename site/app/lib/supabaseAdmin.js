import { createClient } from "@supabase/supabase-js";

// Client admin (service_role) — usage exclusif côté serveur (API routes), jamais exposé au navigateur.
export function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
