package database

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class AndroidDatabaseHelper(context: Context, dbName: String) : DatabaseHelper {
    private val helper = object : SQLiteOpenHelper(context, dbName, null, 1) {
        override fun onCreate(db: SQLiteDatabase) {
            db.execSQL(DatabaseSchema.CREATE_NOTE_NODE_TABLE)
            db.execSQL(DatabaseSchema.CREATE_BLOCK_TABLE)
            db.execSQL(DatabaseSchema.CREATE_BACKLINK_TABLE)
            db.execSQL(DatabaseSchema.CREATE_SYNC_METADATA_TABLE)
            db.execSQL(DatabaseSchema.CREATE_REVISION_HISTORY_TABLE)
            db.execSQL(DatabaseSchema.CREATE_BACKLINK_INDEX)
            db.execSQL(DatabaseSchema.CREATE_BLOCK_NOTE_INDEX)
            db.execSQL(DatabaseSchema.CREATE_REVISION_NOTE_INDEX)
        }

        override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
            println("[AndroidDatabaseHelper] Migration from v$oldVersion to v$newVersion — no migrations defined yet, skipping.")
        }
    }

    private var db: SQLiteDatabase? = null

    override fun initializeDatabase(passphrase: String) {
        db = helper.writableDatabase
        println("[SQLite] Android database initialized.")
    }

    override fun closeConnection() {
        helper.close()
        db = null
    }

    override fun executeWrite(sql: String, bindArgs: Array<Any?>) {
        val database = db ?: throw IllegalStateException("Database not initialized.")
        database.execSQL(sql, bindArgs)
    }

    override fun executeQuery(
        sql: String,
        bindArgs: Array<Any?>
    ): List<Map<String, Any>> {
        val database = db ?: throw IllegalStateException("Database not initialized.")
        val cursor = database.rawQuery(sql, bindArgs.map { it?.toString() }.toTypedArray())
        val results = mutableListOf<Map<String, Any>>()
        cursor.use { c ->
            val cols = c.columnNames
            while (c.moveToNext()) {
                val row = mutableMapOf<String, Any>()
                for (col in cols) {
                    val idx = c.getColumnIndexOrThrow(col)
                    when (c.getType(idx)) {
                        android.database.Cursor.FIELD_TYPE_NULL -> {}
                        android.database.Cursor.FIELD_TYPE_INTEGER -> row[col] = c.getLong(idx)
                        android.database.Cursor.FIELD_TYPE_FLOAT -> row[col] = c.getDouble(idx)
                        android.database.Cursor.FIELD_TYPE_BLOB -> row[col] = c.getBlob(idx)
                        else -> row[col] = c.getString(idx) ?: ""
                    }
                }
                results.add(row)
            }
        }
        return results
    }
}

object AppContextHolder {
    lateinit var context: Context

    fun init(ctx: Context) {
        context = ctx.applicationContext
    }
}
