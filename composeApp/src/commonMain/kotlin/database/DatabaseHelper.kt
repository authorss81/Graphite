package database

interface DatabaseHelper {
    fun initializeDatabase(passphrase: String)
    fun closeConnection()
    fun executeWrite(sql: String, bindArgs: Array<Any?>)
    fun executeQuery(sql: String, bindArgs: Array<Any?>): List<Map<String, Any>>
    fun beginTransaction()
    fun commitTransaction()
    fun rollbackTransaction()
}

class CommonDatabaseHelper : DatabaseHelper {
    private var isInitialized = false

    override fun initializeDatabase(passphrase: String) {
        this.isInitialized = true
        println("[Database] Initializing with passphrase: ${passphrase.take(4)}...")
    }

    override fun closeConnection() {
        this.isInitialized = false
        println("[Database] Connection closed.")
    }

    override fun executeWrite(sql: String, bindArgs: Array<Any?>): Unit {
        if (!isInitialized) throw IllegalStateException("Database not initialized.")
        println("[Database Write] $sql | args: ${bindArgs.joinToString()}")
    }

    override fun executeQuery(sql: String, bindArgs: Array<Any?>): List<Map<String, Any>> {
        if (!isInitialized) throw IllegalStateException("Database not initialized.")
        println("[Database Query] $sql | args: ${bindArgs.joinToString()}")
        return emptyList()
    }

    override fun beginTransaction() {
        if (!isInitialized) throw IllegalStateException("Database not initialized.")
        println("[Database] Transaction started.")
    }

    override fun commitTransaction() {
        if (!isInitialized) throw IllegalStateException("Database not initialized.")
        println("[Database] Transaction committed.")
    }

    override fun rollbackTransaction() {
        if (!isInitialized) throw IllegalStateException("Database not initialized.")
        println("[Database] Transaction rolled back.")
    }
}

expect fun createDatabaseHelper(dbPath: String = "graphite.db"): DatabaseHelper
