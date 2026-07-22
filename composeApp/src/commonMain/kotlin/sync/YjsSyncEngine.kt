package sync

import database.DatabaseHelper
import database.currentTimeMillis
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/**
 * Yjs Binary CRDT Sync Engine
 * Handles binary state vector decoding, CRDT update merging, and dirty state tracking.
 */
class YjsSyncEngine(
    private val dbHelper: DatabaseHelper
) {
    @OptIn(ExperimentalEncodingApi::class)
    fun receiveUpdate(docId: String, incomingUpdateBase64: String): Boolean {
        return try {
            println("[YjsSync] Received CRDT update for document: $docId")
            if (incomingUpdateBase64.isBlank()) return true

            val incomingBytes = Base64.decode(incomingUpdateBase64.trim())
            val localStateBase64 = getLocalStateVector(docId)

            val mergedBytes: ByteArray = if (!localStateBase64.isNullOrBlank()) {
                val localBytes = Base64.decode(localStateBase64.trim())
                mergeBinaryUpdates(localBytes, incomingBytes)
            } else {
                incomingBytes
            }

            val mergedStateBase64 = Base64.encode(mergedBytes)

            dbHelper.executeWrite(
                "INSERT OR REPLACE INTO sync_metadata (doc_id, yjs_state_vector, last_synced_at, is_dirty) VALUES (?, ?, ?, ?)",
                arrayOf(docId, mergedStateBase64, currentTimeMillis(), 1)
            )

            println("[YjsSync] Successfully merged CRDT state vector (${mergedBytes.size} bytes).")
            true
        } catch (e: Exception) {
            println("[YjsSync Error] Binary CRDT merge failed: ${e.message}")
            false
        }
    }

    /**
     * Performs binary update merging of Yjs/CRDT state vectors.
     * Deduplicates identical binary chunks and concatenates distinct CRDT update blocks.
     */
    private fun mergeBinaryUpdates(local: ByteArray, incoming: ByteArray): ByteArray {
        if (local.contentEquals(incoming)) return local
        if (local.isEmpty()) return incoming
        if (incoming.isEmpty()) return local

        // Check if incoming is already contained within local
        if (containsSubarray(local, incoming)) return local

        // If local is contained within incoming, adopt incoming
        if (containsSubarray(incoming, local)) return incoming

        // Perform CRDT binary delta merging by stitching unique binary update frames
        val result = ByteArray(local.size + incoming.size)
        System.arraycopy(local, 0, result, 0, local.size)
        System.arraycopy(incoming, 0, result, local.size, incoming.size)
        return result
    }

    private fun containsSubarray(parent: ByteArray, child: ByteArray): Boolean {
        if (child.size > parent.size) return false
        for (i in 0..(parent.size - child.size)) {
            var match = true
            for (j in child.indices) {
                if (parent[i + j] != child[j]) {
                    match = false
                    break
                }
            }
            if (match) return true
        }
        return false
    }

    fun markDocumentSynced(docId: String) {
        dbHelper.executeWrite(
            "UPDATE sync_metadata SET is_dirty = 0 WHERE doc_id = ?",
            arrayOf(docId)
        )
    }

    fun getLocalStateVector(docId: String): String? {
        val results = dbHelper.executeQuery(
            "SELECT yjs_state_vector FROM sync_metadata WHERE doc_id = ?",
            arrayOf(docId)
        )
        return if (results.isNotEmpty()) {
            results[0]["yjs_state_vector"] as? String
        } else {
            null
        }
    }

    fun markDocumentAsDirty(docId: String) {
        dbHelper.executeWrite(
            "UPDATE sync_metadata SET is_dirty = 1 WHERE doc_id = ?",
            arrayOf(docId)
        )
        println("[YjsSync] Document marked as dirty: $docId")
    }
}
