package sync

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.auth.Auth

object SupabaseClient {
    private const val DEFAULT_URL = "https://trabkkiursawlwavtsdv.supabase.co"
    private const val DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYWJra2l1cnNhd2x3YXZ0c2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDQyNjYsImV4cCI6MjEwMDE4MDI2Nn0.hXungCfYolg-UwDoJDNFy7sS2GXK0J3JlL0ytZxmHF0"

    val client = createSupabaseClient(
        supabaseUrl = DEFAULT_URL,
        supabaseKey = DEFAULT_ANON_KEY
    ) {
        install(Postgrest)
        install(Auth)
    }

    fun isConfigured(): Boolean = true
}
