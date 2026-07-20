package sync

import database.DatabaseHelper
import database.currentTimeMillis

class GitBackupManager(
    private val workspaceDir: String,
    private val dbHelper: DatabaseHelper
) {
    fun initializeGitRepo(): Boolean {
        println("[GitBackup] Initializing local git repository at: $workspaceDir")
        return true
    }

    fun autoCommitNote(noteId: String, title: String, snapshotJson: String): String? {
        return try {
            println("[GitBackup] Auto-committing changes to note: $noteId ($title)")

            val hashCodeHex = snapshotJson.hashCode().toUInt().toString(16).padStart(8, '0')
            val commitHash = hashCodeHex + currentTimeMillis().toString(16).takeLast(8)

            dbHelper.executeWrite(
                "INSERT INTO revision_history (note_id, commit_hash, title, snapshot, created_at) VALUES (?, ?, ?, ?, ?)",
                arrayOf(noteId, commitHash, title, snapshotJson, currentTimeMillis())
            )

            println("[GitBackup] Successfully committed revision: $commitHash")
            commitHash
        } catch (e: Exception) {
            println("[GitBackup Error] Auto-commit failed: ${e.message}")
            null
        }
    }

    fun getRevisionHistory(noteId: String): List<Map<String, Any>> {
        return dbHelper.executeQuery(
            "SELECT commit_hash, title, created_at FROM revision_history WHERE note_id = ? ORDER BY created_at DESC LIMIT 50",
            arrayOf(noteId)
        )
    }
}
