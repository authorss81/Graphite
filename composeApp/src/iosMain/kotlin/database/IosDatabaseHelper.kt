@file:OptIn(kotlinx.cinterop.ExperimentalForeignApi::class)

package database

import kotlinx.cinterop.*
import sqlite3.*

class IosDatabaseHelper(private val dbPath: String) : DatabaseHelper {
    private var db: CPointer<sqlite3>? = null

    override fun initializeDatabase(passphrase: String) {
        memScoped {
            val dbPtr = alloc<CPointerVar<sqlite3>>()
            val rc = sqlite3_open(dbPath.cstr, dbPtr.ptr)
            if (rc != SQLITE_OK) {
                val msg = dbPtr.value?.let { sqlite3_errmsg(it)?.toKString() } ?: "unknown"
                throw RuntimeException("Failed to open database: $msg")
            }
            db = dbPtr.value
        }
        val createSql = listOf(
            DatabaseSchema.CREATE_NOTE_NODE_TABLE,
            DatabaseSchema.CREATE_BLOCK_TABLE,
            DatabaseSchema.CREATE_BACKLINK_TABLE,
            DatabaseSchema.CREATE_SYNC_METADATA_TABLE,
            DatabaseSchema.CREATE_REVISION_HISTORY_TABLE,
            DatabaseSchema.CREATE_BACKLINK_INDEX,
            DatabaseSchema.CREATE_BLOCK_NOTE_INDEX,
            DatabaseSchema.CREATE_REVISION_NOTE_INDEX,
        ).joinToString("\n")
        execSql(createSql)
        println("[SQLite iOS] Database initialized at $dbPath")
    }

    private fun execSql(sql: String) {
        val conn = db ?: throw IllegalStateException("Database not initialized.")
        memScoped {
            val errPtr = alloc<CPointerVar<ByteVar>>()
            val rc = sqlite3_exec(conn, sql.cstr, null, null, errPtr.ptr)
            if (rc != SQLITE_OK) {
                val msg = errPtr.value?.toKString() ?: "unknown"
                throw RuntimeException("SQL error: $msg")
            }
        }
    }

    override fun closeConnection() {
        db?.let { sqlite3_close(it) }
        db = null
        println("[SQLite iOS] Database connection closed.")
    }

    override fun executeWrite(sql: String, bindArgs: Array<Any>) {
        val conn = db ?: throw IllegalStateException("Database not initialized.")
        memScoped {
            val stmtPtr = alloc<CPointerVar<sqlite3_stmt>>()
            val rc = sqlite3_prepare_v2(conn, sql.cstr, -1, stmtPtr.ptr, null)
            if (rc != SQLITE_OK) {
                throw RuntimeException("Prepare failed: ${sqlite3_errmsg(conn)?.toKString()}")
            }
            val stmt = stmtPtr.value ?: throw RuntimeException("Null statement")
            bindArgs.forEachIndexed { index, arg -> bindValue(stmt, index + 1, arg) }
            sqlite3_step(stmt)
            sqlite3_finalize(stmt)
        }
    }

    override fun executeQuery(sql: String, bindArgs: Array<Any>): List<Map<String, Any>> {
        val conn = db ?: throw IllegalStateException("Database not initialized.")
        val results = mutableListOf<Map<String, Any>>()
        memScoped {
            val stmtPtr = alloc<CPointerVar<sqlite3_stmt>>()
            val rc = sqlite3_prepare_v2(conn, sql.cstr, -1, stmtPtr.ptr, null)
            if (rc != SQLITE_OK) {
                throw RuntimeException("Prepare failed: ${sqlite3_errmsg(conn)?.toKString()}")
            }
            val stmt = stmtPtr.value ?: throw RuntimeException("Null statement")
            bindArgs.forEachIndexed { index, arg -> bindValue(stmt, index + 1, arg) }
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                val columnCount = sqlite3_column_count(stmt)
                val row = mutableMapOf<String, Any>()
                for (i in 0 until columnCount) {
                    val name = sqlite3_column_name(stmt, i)?.toKString() ?: "col$i"
                    row[name] = readColumn(stmt, i)
                }
                results.add(row)
            }
            sqlite3_finalize(stmt)
        }
        return results
    }

    private fun bindValue(stmt: CPointer<sqlite3_stmt>, index: Int, value: Any?) {
        when (value) {
            null -> sqlite3_bind_null(stmt, index)
            is String -> sqlite3_bind_text(stmt, index, value.cstr, -1, null)
            is Int -> sqlite3_bind_int(stmt, index, value)
            is Long -> sqlite3_bind_int64(stmt, index, value)
            is Double -> sqlite3_bind_double(stmt, index, value)
            is Float -> sqlite3_bind_double(stmt, index, value.toDouble())
            is Boolean -> sqlite3_bind_int(stmt, index, if (value) 1 else 0)
            else -> sqlite3_bind_text(stmt, index, value.toString().cstr, -1, null)
        }
    }

    private fun readColumn(stmt: CPointer<sqlite3_stmt>, i: Int): Any {
        return when (sqlite3_column_type(stmt, i)) {
            SQLITE_INTEGER -> sqlite3_column_int64(stmt, i)
            SQLITE_FLOAT -> sqlite3_column_double(stmt, i)
            SQLITE_NULL -> ""
            else -> sqlite3_column_text(stmt, i)?.toKString() ?: ""
        }
    }
}
