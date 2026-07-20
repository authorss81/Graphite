package database

actual fun currentTimeMillis(): Long = System.currentTimeMillis()

actual fun createDatabaseHelper(dbPath: String): DatabaseHelper =
    JvmDatabaseHelper(dbPath)
