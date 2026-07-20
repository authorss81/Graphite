package database

import platform.Foundation.NSDate

actual fun currentTimeMillis(): Long = (NSDate().timeIntervalSince1970 * 1000).toLong()

actual fun createDatabaseHelper(dbPath: String): DatabaseHelper =
    CommonDatabaseHelper()
