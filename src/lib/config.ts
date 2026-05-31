export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const familyId = (import.meta.env.VITE_FAMILY_ID as string | undefined) || "duirian-home";

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
