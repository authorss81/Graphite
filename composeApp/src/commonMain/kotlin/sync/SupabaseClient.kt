package sync

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.auth.Auth

object SupabaseClient {
    private const val DEFAULT_URL = "https://your-project.supabase.co"
    private const val DEFAULT_ANON_KEY = "your-anon-key"

    val client = createSupabaseClient(
        supabaseUrl = DEFAULT_URL,
        supabaseKey = DEFAULT_ANON_KEY
    ) {
        install(Postgrest)
        install(Auth)
    }

    fun isConfigured(): Boolean =
        DEFAULT_URL != "https://your-project.supabase.co"
}
