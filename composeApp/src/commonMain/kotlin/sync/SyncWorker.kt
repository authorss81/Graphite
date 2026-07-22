package sync

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.Base64
import java.nio.charset.StandardCharsets

class SyncWorker(
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default)
) {
    private val client = createSupabaseClient(
        supabaseUrl = "https://trabkkiursawlwavtsdv.supabase.co",
        supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYWJra2l1cnNhd2x3YXZ0c2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDQyNjYsImV4cCI6MjEwMDE4MDI2Nn0.hXungCfYolg-UwDoJDNFy7sS2GXK0J3JlL0ytZxmHF0"
    ) {
        install(Postgrest)
        install(io.github.jan.supabase.auth.Auth)
    }

    private val pendingSyncs = mutableSetOf<String>()

    fun enqueueSync(docId: String, localState: String, remoteVersion: String? = null) {
        pendingSyncs.add(docId)
        scope.launch {
            try {
                syncDocument(docId, localState, remoteVersion)
                pendingSyncs.remove(docId)
            } catch (e: Exception) {
                println("[SyncWorker] Sync failed for $docId: ${e.message}")
                val backoff = 1000L * (1 shl pendingSyncs.size.coerceAtMost(10))
                delay(backoff)
            }
        }
    }

    private suspend fun syncDocument(docId: String, localState: String, remoteVersion: String? = null) {
        val payload = mapOf(
            "doc_id" to docId,
            "local_state" to localState,
            "remote_version" to (remoteVersion ?: "0"),
            "timestamp" to System.currentTimeMillis().toString()
        )

        val payloadJson = Json.encodeToString(payload)
        val base64Payload = Base64.getEncoder().encodeToString(payloadJson.toByteArray(StandardCharsets.UTF_8))

        client.from("document_sync").insert(
            mapOf(
                "doc_id" to docId,
                "payload" to base64Payload,
                "created_at" to System.currentTimeMillis().toString(),
                "synced" to "true"
            )
        )
    }

    fun isSyncPending(docId: String): Boolean = pendingSyncs.contains(docId)

    fun getPendingSyncsCount(): Int = pendingSyncs.size

    suspend fun markSynced(docId: String): Boolean {
        return try {
            client.from("document_sync").update(mapOf("synced" to "true")) {
                filter {
                    eq("doc_id", docId)
                }
            }
            true
        } catch (e: Exception) {
            println("[SyncWorker Error] markSynced failed: ${e.message}")
            false
        }
    }
}

class SyncException(message: String) : Exception(message)
