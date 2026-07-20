package database

object DatabaseSchema {
    const val TABLE_NOTE_NODE = "note_nodes"
    const val TABLE_BLOCK = "block_entities"
    const val TABLE_BACKLINK = "backlink_entities"
    const val TABLE_SYNC_METADATA = "sync_metadata"
    const val TABLE_REVISION_HISTORY = "revision_history"

    val CREATE_NOTE_NODE_TABLE = """
        CREATE TABLE IF NOT EXISTS $TABLE_NOTE_NODE (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            parent_id TEXT,
            is_folder INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            tags TEXT NOT NULL,
            database_id TEXT,
            FOREIGN KEY (parent_id) REFERENCES $TABLE_NOTE_NODE(id) ON DELETE CASCADE
        );
    """.trimIndent()

    val CREATE_BLOCK_TABLE = """
        CREATE TABLE IF NOT EXISTS $TABLE_BLOCK (
            id TEXT PRIMARY KEY NOT NULL,
            note_id TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            order_index TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (note_id) REFERENCES $TABLE_NOTE_NODE(id) ON DELETE CASCADE
        );
    """.trimIndent()

    val CREATE_BACKLINK_TABLE = """
        CREATE TABLE IF NOT EXISTS $TABLE_BACKLINK (
            id TEXT PRIMARY KEY NOT NULL,
            source_note_id TEXT NOT NULL,
            target_note_id TEXT NOT NULL,
            context_text TEXT NOT NULL,
            FOREIGN KEY (source_note_id) REFERENCES $TABLE_NOTE_NODE(id) ON DELETE CASCADE,
            FOREIGN KEY (target_note_id) REFERENCES $TABLE_NOTE_NODE(id) ON DELETE CASCADE
        );
    """.trimIndent()

    const val CREATE_BACKLINK_INDEX = "CREATE INDEX IF NOT EXISTS idx_backlink_target ON $TABLE_BACKLINK(target_note_id);"
    const val CREATE_BLOCK_NOTE_INDEX = "CREATE INDEX IF NOT EXISTS idx_block_note ON $TABLE_BLOCK(note_id);"

    val CREATE_SYNC_METADATA_TABLE = """
        CREATE TABLE IF NOT EXISTS $TABLE_SYNC_METADATA (
            doc_id TEXT PRIMARY KEY NOT NULL,
            yjs_state_vector TEXT,
            last_synced_at INTEGER NOT NULL,
            is_dirty INTEGER NOT NULL DEFAULT 0
        );
    """.trimIndent()

    val CREATE_REVISION_HISTORY_TABLE = """
        CREATE TABLE IF NOT EXISTS $TABLE_REVISION_HISTORY (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id TEXT NOT NULL,
            commit_hash TEXT NOT NULL,
            title TEXT,
            snapshot TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (note_id) REFERENCES $TABLE_NOTE_NODE(id) ON DELETE CASCADE
        );
    """.trimIndent()

    const val CREATE_REVISION_NOTE_INDEX = "CREATE INDEX IF NOT EXISTS idx_revision_note ON $TABLE_REVISION_HISTORY(note_id);"
}
