package database

import java.sql.Connection
import java.sql.DriverManager

class JvmDatabaseHelper(private val dbPath: String) : DatabaseHelper {
    private var connection: Connection? = null

    override fun initializeDatabase(passphrase: String) {
        Class.forName("org.sqlite.JDBC")
        val conn = DriverManager.getConnection("jdbc:sqlite:$dbPath")
        connection = conn

        val stmt = conn.createStatement()
        stmt.executeUpdate(DatabaseSchema.CREATE_NOTE_NODE_TABLE)
        stmt.executeUpdate(DatabaseSchema.CREATE_BLOCK_TABLE)
        stmt.executeUpdate(DatabaseSchema.CREATE_BACKLINK_TABLE)
        stmt.executeUpdate(DatabaseSchema.CREATE_SYNC_METADATA_TABLE)
        stmt.executeUpdate(DatabaseSchema.CREATE_REVISION_HISTORY_TABLE)
        stmt.executeUpdate(DatabaseSchema.CREATE_BACKLINK_INDEX)
        stmt.executeUpdate(DatabaseSchema.CREATE_BLOCK_NOTE_INDEX)
        stmt.executeUpdate(DatabaseSchema.CREATE_REVISION_NOTE_INDEX)
        stmt.close()

        println("[SQLite] Database initialized at $dbPath")
    }

    override fun closeConnection() {
        connection?.close()
        connection = null
        println("[SQLite] Database connection closed.")
    }

    override fun executeWrite(sql: String, bindArgs: Array<Any?>) {
        val conn = connection ?: throw IllegalStateException("Database not initialized.")
        val pstmt = conn.prepareStatement(sql)
        for ((index, arg) in bindArgs.withIndex()) {
            pstmt.setObject(index + 1, arg)
        }
        pstmt.executeUpdate()
        pstmt.close()
    }

    override fun executeQuery(
        sql: String,
        bindArgs: Array<Any?>
    ): List<Map<String, Any>> {
        val conn = connection ?: throw IllegalStateException("Database not initialized.")
        val pstmt = conn.prepareStatement(sql)
        for ((index, arg) in bindArgs.withIndex()) {
            pstmt.setObject(index + 1, arg)
        }
        val rs = pstmt.executeQuery()
        val meta = rs.metaData
        val columnCount = meta.columnCount
        val results = mutableListOf<Map<String, Any>>()
        while (rs.next()) {
            val row = mutableMapOf<String, Any>()
            for (i in 1..columnCount) {
                val value = rs.getObject(i)
                if (value != null) {
                    row[meta.getColumnName(i)] = value
                }
            }
            results.add(row)
        }
        rs.close()
        pstmt.close()
        return results
    }
}
