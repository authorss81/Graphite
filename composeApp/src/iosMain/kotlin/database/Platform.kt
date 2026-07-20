package database

import platform.CoreFoundation.CFAbsoluteTimeGetCurrent
import platform.CoreFoundation.kCFAbsoluteTimeIntervalSince1970

actual fun currentTimeMillis(): Long {
    val absoluteTime = CFAbsoluteTimeGetCurrent() + kCFAbsoluteTimeIntervalSince1970
    return (absoluteTime * 1000.0).toLong()
}

actual fun createDatabaseHelper(dbPath: String): DatabaseHelper =
    IosDatabaseHelper(dbPath)
