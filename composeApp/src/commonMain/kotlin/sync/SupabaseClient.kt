package sync

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.auth.Auth

object SupabaseClient {
    @Volatile
    private var _client: io.github.jan.supabase.SupabaseClient? = null

    fun configure(url: String, anonKey: String) {
        _client = createSupabaseClient(
            supabaseUrl = url,
            supabaseKey = anonKey
        ) {
            install(Postgrest)
            install(Auth)
        }
    }

    val client: io.github.jan.supabase.SupabaseClient
        get() {
            return _client ?: synchronized(this) {
                _client ?: throw IllegalStateException(
                    "SupabaseClient not configured. Call configure(url, anonKey) first."
                )
            }
        }

    fun isConfigured(): Boolean = _client != null
}
