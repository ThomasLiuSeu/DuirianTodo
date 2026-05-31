import { createClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "./config";

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl!, supabaseAnonKey!) : null;
