/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_GEMINI_API_KEY?: string // Optional - only needed for AI reports
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
