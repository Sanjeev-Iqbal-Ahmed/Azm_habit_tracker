import { getDatabase } from './sqlite';

export type ToDoNowRecord = {
    id: number;
    task: string;
    completed: 0 | 1;
    display_order: number;
    target_date: string; // YYYY-MM-DD format
    priority: 'high' | 'medium' | 'low';
    created_at: string;
    updated_at: string;
};

export type DailyNoteRecord = {
    id: number;
    content: string;
    target_date: string; // YYYY-MM-DD format
    created_at: string;
    updated_at: string;
};

let isInitialized = false;

export function initializeToDoNowTables(): void {
    if (isInitialized) return;

    const db = getDatabase();

    db.withTransactionSync(() => {
        // Try to add priority column if it doesn't exist (for existing databases)
        try {
            const tableInfo = db.getAllSync<{ name: string }>(`PRAGMA table_info(to_do_now)`);
            if (tableInfo.length > 0 && !tableInfo.some(col => col.name === 'priority')) {
                db.runSync(`ALTER TABLE to_do_now ADD COLUMN priority TEXT DEFAULT 'low'`);
            }
        } catch (e) {
            // Ignore if error occurs during pragma or alter
        }

        // Create to_do_now table
        db.runSync(`CREATE TABLE IF NOT EXISTS to_do_now (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0,
            target_date TEXT NOT NULL,
            priority TEXT DEFAULT 'low',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`);

        // Create daily_notes table
        db.runSync(`CREATE TABLE IF NOT EXISTS daily_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            target_date TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`);

        // Create indexes for better performance
        db.runSync(`CREATE INDEX IF NOT EXISTS idx_to_do_now_date ON to_do_now (target_date)`);
        db.runSync(`CREATE INDEX IF NOT EXISTS idx_to_do_now_date_order ON to_do_now (target_date, display_order)`);
        db.runSync(`CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON daily_notes (target_date)`);
    });

    isInitialized = true;
}

// CRUD operations for to_do_now table
export function createToDoNow(task: string, targetDate: string, priority: 'high' | 'medium' | 'low' = 'low'): number {
    initializeToDoNowTables();
    const db = getDatabase();

    // Get the next display_order for this date
    const maxOrder = db.getFirstSync<{ max_order: number }>(
        `SELECT MAX(display_order) as max_order FROM to_do_now WHERE target_date = ? AND completed = 0`,
        [targetDate]
    );

    const nextOrder = (maxOrder?.max_order ?? -1) + 1;

    const result = db.runSync(
        `INSERT INTO to_do_now (task, display_order, target_date, priority) VALUES (?, ?, ?, ?)`,
        [task, nextOrder, targetDate, priority]
    );

    return result.lastInsertRowId;
}

export function getToDoNowsForDate(targetDate: string): ToDoNowRecord[] {
    initializeToDoNowTables();
    const db = getDatabase();

    return db.getAllSync<ToDoNowRecord>(
        `SELECT * FROM to_do_now 
         WHERE target_date = ? 
         ORDER BY 
            CASE priority 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
                ELSE 4 
            END ASC, 
            display_order ASC, 
            created_at ASC`,
        [targetDate]
    );
}

export function updateToDoNow(id: number, task: string, priority: 'high' | 'medium' | 'low'): void {
    initializeToDoNowTables();
    const db = getDatabase();

    db.runSync(
        `UPDATE to_do_now SET task = ?, priority = ?, updated_at = datetime('now') WHERE id = ?`,
        [task, priority, id]
    );
}

export function toggleToDoNowCompletion(id: number): void {
    initializeToDoNowTables();
    const db = getDatabase();

    db.runSync(
        `UPDATE to_do_now SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END, updated_at = datetime('now') WHERE id = ?`,
        [id]
    );
}

export function deleteToDoNow(id: number): void {
    initializeToDoNowTables();
    const db = getDatabase();

    db.runSync(`DELETE FROM to_do_now WHERE id = ?`, [id]);
}

export function reorderToDoNows(todoIds: number[]): void {
    initializeToDoNowTables();
    const db = getDatabase();

    db.withTransactionSync(() => {
        todoIds.forEach((id, index) => {
            db.runSync(
                `UPDATE to_do_now SET display_order = ?, updated_at = datetime('now') WHERE id = ?`,
                [index, id]
            );
        });
    });
}

// CRUD operations for daily_notes table
export function createOrUpdateDailyNote(content: string, targetDate: string): number {
    initializeToDoNowTables();
    const db = getDatabase();

    // Check if note already exists for this date
    const existing = db.getFirstSync<{ id: number }>(
        `SELECT id FROM daily_notes WHERE target_date = ?`,
        [targetDate]
    );

    if (existing) {
        // Update existing note
        db.runSync(
            `UPDATE daily_notes SET content = ?, updated_at = datetime('now') WHERE target_date = ?`,
            [content, targetDate]
        );
        return existing.id;
    } else {
        // Create new note
        const result = db.runSync(
            `INSERT INTO daily_notes (content, target_date) VALUES (?, ?)`,
            [content, targetDate]
        );
        return result.lastInsertRowId;
    }
}

export function getDailyNoteForDate(targetDate: string): DailyNoteRecord | null {
    initializeToDoNowTables();
    const db = getDatabase();

    return db.getFirstSync<DailyNoteRecord>(
        `SELECT * FROM daily_notes WHERE target_date = ?`,
        [targetDate]
    ) || null;
}

export function deleteDailyNote(targetDate: string): void {
    initializeToDoNowTables();
    const db = getDatabase();

    db.runSync(`DELETE FROM daily_notes WHERE target_date = ?`, [targetDate]);
}

// Utility functions
export function getDatesWithToDoNows(startDate: string, endDate: string): string[] {
    initializeToDoNowTables();
    const db = getDatabase();

    const results = db.getAllSync<{ target_date: string }>(
        `SELECT DISTINCT target_date FROM to_do_now WHERE target_date BETWEEN ? AND ? ORDER BY target_date ASC`,
        [startDate, endDate]
    );

    return results.map(r => r.target_date);
}

export function getDateSummaryForToDoNow(targetDate: string): {
    total: number;
    completed: number;
    hasNote: boolean;
} {
    initializeToDoNowTables();
    const db = getDatabase();

    const todoResult = db.getFirstSync<{ total: number; completed: number }>(
        `SELECT COUNT(*) as total, SUM(completed) as completed FROM to_do_now WHERE target_date = ?`,
        [targetDate]
    );

    const noteResult = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM daily_notes WHERE target_date = ?`,
        [targetDate]
    );

    return {
        total: todoResult?.total ?? 0,
        completed: todoResult?.completed ?? 0,
        hasNote: (noteResult?.count ?? 0) > 0
    };
}
