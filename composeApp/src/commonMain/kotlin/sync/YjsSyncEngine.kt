package sync

import database.DatabaseHelper
import database.currentTimeMillis

class YjsSyncEngine(
    private val dbHelper: DatabaseHelper
) {
    fun receiveUpdate(docId: String, incomingUpdateBase64: String): Boolean {
        return try {
            println("[YjsSync] Received CRDT update for document: $docId")

            val localState = getLocalStateVector(docId)

            val mergedStateBase64 = if (localState != null) {
                incomingUpdateBase64
            } else {
                incomingUpdateBase64
            }

            dbHelper.executeWrite(
                "INSERT OR REPLACE INTO sync_metadata (doc_id, yjs_state_vector, last_synced_at, is_dirty) VALUES (?, ?, ?, ?)",
                arrayOf(docId, mergedStateBase64, currentTimeMillis(), 1)
            )

            println("[YjsSync] Successfully committed document state.")
            true
        } catch (e: Exception) {
            println("[YjsSync Error] Merge failed: ${e.message}")
            false
        }
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
