package database

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class JvmDatabaseHelperTest {

    private fun newHelper(): JvmDatabaseHelper {
        val helper = JvmDatabaseHelper(":memory:")
        helper.initializeDatabase("test-passphrase")
        return helper
    }

    @Test
    fun `initializeDatabase creates all schema tables`() {
        val helper = newHelper()
        val tables = helper.executeQuery(
            "SELECT name FROM sqlite_master WHERE type='table'",
            emptyArray<Any?>(),
        ).map { it["name"].toString() }

        assertTrue(DatabaseSchema.TABLE_NOTE_NODE in tables, "note_nodes missing")
        assertTrue(DatabaseSchema.TABLE_BLOCK in tables, "block_entities missing")
        assertTrue(DatabaseSchema.TABLE_BACKLINK in tables, "backlink_entities missing")
        assertTrue(DatabaseSchema.TABLE_SYNC_METADATA in tables, "sync_metadata missing")
        assertTrue(DatabaseSchema.TABLE_REVISION_HISTORY in tables, "revision_history missing")
        helper.closeConnection()
    }

    @Test
    fun `note node insert and query round-trips`() {
        val helper = newHelper()
        helper.executeWrite(
            "INSERT INTO ${DatabaseSchema.TABLE_NOTE_NODE} " +
                "(id, title, parent_id, is_folder, created_at, updated_at, is_pinned, is_archived, tags, database_id) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            arrayOf<Any?>("n1", "My Note", null, 0, 1000L, 1001L, 0, 0, "[]", "db1"),
        )

        val rows = helper.executeQuery(
            "SELECT id, title, is_folder FROM ${DatabaseSchema.TABLE_NOTE_NODE} WHERE id = ?",
            arrayOf<Any?>("n1"),
        )

        assertEquals(1, rows.size)
        assertEquals("n1", rows[0]["id"])
        assertEquals("My Note", rows[0]["title"])
        assertEquals(0, rows[0]["is_folder"])
        helper.closeConnection()
    }

    @Test
    fun `block entity insert and query round-trips`() {
        val helper = newHelper()
        helper.executeWrite(
            "INSERT INTO ${DatabaseSchema.TABLE_NOTE_NODE} " +
                "(id, title, parent_id, is_folder, created_at, updated_at, is_pinned, is_archived, tags, database_id) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            arrayOf<Any?>("n1", "Parent", null, 0, 1L, 1L, 0, 0, "[]", "db1"),
        )
        helper.executeWrite(
            "INSERT INTO ${DatabaseSchema.TABLE_BLOCK} " +
                "(id, note_id, type, content, order_index, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
            arrayOf<Any?>("b1", "n1", "text", "{\"text\":\"hi\"}", "a", 2L, 2L),
        )

        val rows = helper.executeQuery(
            "SELECT id, note_id, type, content, order_index FROM ${DatabaseSchema.TABLE_BLOCK} WHERE note_id = ? ORDER BY order_index",
            arrayOf<Any?>("n1"),
        )

        assertEquals(1, rows.size)
        assertEquals("b1", rows[0]["id"])
        assertEquals("text", rows[0]["type"])
        assertEquals("a", rows[0]["order_index"])
        helper.closeConnection()
    }

    @Test
    fun `query before initialization throws`() {
        var thrown = false
        try {
            val helper = JvmDatabaseHelper(":memory:")
            helper.executeQuery("SELECT 1", emptyArray<Any?>())
        } catch (e: IllegalStateException) {
            thrown = true
        }
        assertTrue(thrown, "Expected IllegalStateException when querying before init")
    }
}
