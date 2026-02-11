import * as SQLite from 'expo-sqlite';
import { quranVerses } from './verses';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export type HabitFrequency = 'daily' | 'weekly';

export type HabitRecord = {
    id: number;
    name: string;
    description: string | null;
    icon: string;
    goal_per_day: number | null;
    unit: string | null;
    start_date: string | null;
    frequency: HabitFrequency;
    is_archived: 0 | 1;
    display_order: number;
    created_at: string;
    updated_at: string;
};

export type HabitLogRecord = {
    id: number;
    habit_id: number;
    log_date: string;
    completed: 0 | 1;
    note: string | null;
    created_at: string;
    updated_at: string;
};

export type ToDoRecord = {
    id: number;
    task: string;
    completed: 0 | 1;
    display_order: number;
    created_at: string;
    updated_at: string;
};

export type NoteRecord = {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
};

/**
 * Open (or return) the single SQLite database connection used by the app.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
    if (!dbInstance) {
        dbInstance = SQLite.openDatabaseSync('habit-builder.db');
        dbInstance.execSync?.('PRAGMA journal_mode = WAL;');
        dbInstance.execSync?.('PRAGMA foreign_keys = ON;');
    }
    return dbInstance;
}

/**
 * Initialize tables once. Call at app start (e.g., in a root effect).
 */
export function initializeDatabase() {
    if (isInitialized) return;
    const db = getDatabase();

    db.withTransactionSync(() => {
        db.runSync(`CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'checkmark-circle',
      goal_per_day INTEGER DEFAULT 1,
      unit TEXT,
      start_date TEXT,
      frequency TEXT DEFAULT 'daily',
      is_archived INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`);

        db.runSync(`CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE (habit_id, log_date)
    );`);

        db.runSync(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );`);

        db.runSync(`CREATE TABLE IF NOT EXISTS to_do (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`);

        db.runSync(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`);

        db.runSync(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      to_pay REAL DEFAULT 0,
      to_get REAL DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`);

        db.runSync(`CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs (habit_id, log_date);`);

        // Backfill columns for older installs if missing.
        try {
            db.runSync(
                `ALTER TABLE habits ADD COLUMN frequency TEXT DEFAULT 'daily'`
            );
        } catch {
            // ignore if column already exists
        }
        try {
            db.runSync(
                `ALTER TABLE habits ADD COLUMN icon TEXT DEFAULT 'checkmark-circle'`
            );
        } catch {
            // ignore if column already exists
        }
        try {
            db.runSync(
                `ALTER TABLE habits ADD COLUMN unit TEXT`
            );
        } catch {
            // ignore if column already exists
        }
        try {
            db.runSync(
                `ALTER TABLE payments ADD COLUMN display_order INTEGER DEFAULT 0`
            );
            // Backfill existing payments with sequential display_order
            db.runSync(`
                UPDATE payments 
                SET display_order = (
                    SELECT COUNT(*) 
                    FROM payments p2 
                    WHERE p2.id <= payments.id
                ) - 1
                WHERE display_order IS NULL OR display_order = 0
            `);
        } catch {
            // ignore if column already exists
        }
        try {
            db.runSync(
                `ALTER TABLE habits ADD COLUMN display_order INTEGER DEFAULT 0`
            );
            // Backfill existing habits
            db.runSync(`
                UPDATE habits 
                SET display_order = (
                    SELECT COUNT(*) 
                    FROM habits h2 
                    WHERE h2.id <= habits.id
                ) - 1
                WHERE display_order IS NULL OR display_order = 0
            `);
        } catch {
            // ignore if column already exists
        }
        try {
            db.runSync(
                `ALTER TABLE to_do ADD COLUMN display_order INTEGER DEFAULT 0`
            );
            // Backfill existing to-dos
            db.runSync(`
                UPDATE to_do 
                SET display_order = (
                    SELECT COUNT(*) 
                    FROM to_do t2 
                    WHERE t2.id <= to_do.id
                ) - 1
                WHERE display_order IS NULL OR display_order = 0
            `);
        } catch {
            // ignore if column already exists
        }

        // Create quotes table
        db.runSync(`CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            verse_no TEXT NOT NULL,
            verse TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );`);
    });

    // Seed quotes table if empty
    const existing = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM quotes'
    );

    if (!existing || existing.count === 0) {
        const stmt = db.prepareSync(
            'INSERT INTO quotes (verse_no, verse) VALUES (?, ?)'
        );

        try {
            for (const verse of quranVerses) {
                stmt.executeSync([verse.verse_no, verse.verse]);
            }
        } finally {
            stmt.finalizeSync();
        }
    }

    isInitialized = true;
}

/**
 * Reset the database - drops all tables and reinitializes
 */
export function resetDatabase(): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
        db.runSync('DROP TABLE IF EXISTS habits');
        db.runSync('DROP TABLE IF EXISTS habit_logs');
        db.runSync('DROP TABLE IF EXISTS settings');
        db.runSync('DROP TABLE IF EXISTS to_do');
        db.runSync('DROP TABLE IF EXISTS notes');
        db.runSync('DROP TABLE IF EXISTS payments');
        db.runSync('DROP TABLE IF EXISTS quotes');
    });
    isInitialized = false;
    initializeDatabase();
}

/**
 * Reset only the quotes table - refreshes Quranic verses without affecting other data
 */
export function resetQuotes(): void {
    const db = getDatabase();

    // Clear quotes table
    db.runSync('DELETE FROM quotes');

    // Re-seed with updated verses
    const stmt = db.prepareSync(
        'INSERT INTO quotes (verse_no, verse) VALUES (?, ?)'
    );

    try {
        for (const verse of quranVerses) {
            stmt.executeSync([verse.verse_no, verse.verse]);
        }
    } finally {
        stmt.finalizeSync();
    }
}

/**
 * Run a parameterized statement (INSERT/UPDATE/DELETE/DDL).
 */
export function runStatement(sql: string, params: SQLite.SQLiteBindParams = []): void {
    getDatabase().runSync(sql, params);
}

/**
 * Run a SELECT query and return all matching rows.
 */
export function queryAll<T = Record<string, unknown>>(
    sql: string,
    params: SQLite.SQLiteBindParams = []
): T[] {
    return getDatabase().getAllSync(sql, params) as T[];
}

/**
 * Create a new habit and return its id.
 */
export function createHabit(data: {
    name: string;
    description?: string;
    icon?: string;
    goalPerDay?: number;
    unit?: string;
    startDate?: string;
    frequency?: HabitFrequency;
}): number {
    const db = getDatabase();

    // Get the current max display_order
    const maxOrderResult = db.getAllSync(
        `SELECT MAX(display_order) as max_order FROM habits WHERE is_archived = 0`
    ) as { max_order: number | null }[];
    const nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

    const result = db.runSync(
        `INSERT INTO habits (name, description, icon, goal_per_day, unit, start_date, frequency, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.name,
            data.description ?? null,
            data.icon ?? 'checkmark-circle',
            data.goalPerDay ?? 1,
            data.unit ?? null,
            data.startDate ?? null,
            data.frequency ?? 'daily',
            nextOrder,
        ]
    );
    return Number(result.lastInsertRowId ?? 0);
}

/**
 * Update an existing habit. Fields not provided are left unchanged.
 */
export function updateHabit(
    id: number,
    updates: Partial<{
        name: string;
        description: string;
        icon: string;
        goalPerDay: number;
        unit: string;
        startDate: string;
        isArchived: boolean;
        frequency: HabitFrequency;
    }>
): void {
    const db = getDatabase();

    const fields: string[] = [];
    const values: SQLite.SQLiteBindParams = [];

    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
    }
    if (updates.icon !== undefined) {
        fields.push('icon = ?');
        values.push(updates.icon);
    }
    if (updates.goalPerDay !== undefined) {
        fields.push('goal_per_day = ?');
        values.push(updates.goalPerDay);
    }
    if (updates.unit !== undefined) {
        fields.push('unit = ?');
        values.push(updates.unit);
    }
    if (updates.startDate !== undefined) {
        fields.push('start_date = ?');
        values.push(updates.startDate);
    }
    if (updates.isArchived !== undefined) {
        fields.push('is_archived = ?');
        values.push(updates.isArchived ? 1 : 0);
    }
    if (updates.frequency !== undefined) {
        fields.push('frequency = ?');
        values.push(updates.frequency);
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = datetime('now', 'localtime')`);
    values.push(id);

    db.runSync(`UPDATE habits SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function getHabits(options: { includeArchived?: boolean } = {}): HabitRecord[] {
    const includeArchived = options.includeArchived ?? false;
    const whereClause = includeArchived ? '' : 'WHERE is_archived = 0';
    return queryAll<HabitRecord>(`SELECT * FROM habits ${whereClause} ORDER BY display_order ASC, created_at DESC;`);
}

export function getHabitById(id: number): HabitRecord | null {
    const db = getDatabase();
    const rows = db.getAllSync(`SELECT * FROM habits WHERE id = ? LIMIT 1`, [id]) as HabitRecord[];
    return rows[0] ?? null;
}

export function getHabitLogs(habitId: number): HabitLogRecord[] {
    return queryAll<HabitLogRecord>(
        `SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY log_date DESC;`,
        [habitId]
    );
}

/**
 * Mark completion status for a habit on a specific date (ISO yyyy-mm-dd).
 */
export function markHabitCompletion(params: {
    habitId: number;
    date: string;
    completed: boolean;
    note?: string;
}): void {
    const db = getDatabase();
    db.runSync(
        `INSERT INTO habit_logs (habit_id, log_date, completed, note)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(habit_id, log_date)
     DO UPDATE SET
       completed = excluded.completed,
       note = COALESCE(excluded.note, habit_logs.note),
       updated_at = datetime('now', 'localtime');`,
        [params.habitId, params.date, params.completed ? 1 : 0, params.note ?? null]
    );
}

/**
 * Toggle completion status for a habit on today's date
 * @param habitId ID of the habit to toggle
 */
export function toggleHabitCompletion(habitId: number): void {
    const today = toDateOnlyString(new Date());
    const logs = getHabitLogs(habitId);
    const todayLog = logs.find(log => log.log_date === today);

    // Toggle the completion status
    markHabitCompletion({
        habitId,
        date: today,
        completed: !todayLog?.completed,
        note: todayLog?.note || undefined
    });
}

/**
 * Update habit progress for a specific date. Stores progress count in the note field.
 * Automatically marks as completed when progress >= goal_per_day.
 * @param habitId ID of the habit
 * @param date Date in YYYY-MM-DD format
 * @param progress Current progress count (e.g., 3 for 3/5 glasses)
 */
export function updateHabitProgress(habitId: number, date: string, progress: number): void {
    const habit = getHabitById(habitId);
    if (!habit) return;

    const goalPerDay = habit.goal_per_day || 1;
    const isCompleted = progress >= goalPerDay;

    markHabitCompletion({
        habitId,
        date,
        completed: isCompleted,
        note: progress.toString()
    });
}

/**
 * Get habit progress for a specific date from the note field.
 * @param habitId ID of the habit
 * @param date Date in YYYY-MM-DD format
 * @returns Current progress count, or 0 if no log exists
 */
export function getHabitProgressForDate(habitId: number, date: string): number {
    const logs = getHabitLogs(habitId);
    const log = logs.find(l => l.log_date === date);

    if (!log || !log.note) return 0;

    const progress = parseInt(log.note, 10);
    return isNaN(progress) ? 0 : progress;
}

const ISO_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Get a date string in YYYY-MM-DD format using LOCAL time.
 * This ensures that "today" corresponds to the user's actual day, not UTC.
 */
export function formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's date string in YYYY-MM-DD format (Effective Local Date).
 */
export function getTodayDateString(): string {
    return formatDateString(new Date());
}

function toDateOnlyString(date: Date): string {
    return formatDateString(date);
}

function normalizeDateString(dateString?: string): string {
    if (dateString) return dateString;
    return getTodayDateString();
}

function getWeekStartKey(date: Date): string {
    const day = date.getDay(); // 0 (Sun) - 6 (Sat)
    const mondayOffset = (day + 6) % 7; // converts Sunday to 6, Monday to 0
    const monday = new Date(date);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - mondayOffset);
    return formatDateString(monday);
}

function calculateDailyStreak(logDates: Set<string>, asOf: string): { streak: number; anchorDate: string | null } {
    let cursor = new Date(asOf);
    let anchor: string | null = null;
    let streak = 0;

    // If today is not completed, allow starting from yesterday; if yesterday also missed, streak is zero.
    if (!logDates.has(toDateOnlyString(cursor))) {
        cursor = new Date(cursor.getTime() - ISO_DAY_MS);
        if (!logDates.has(toDateOnlyString(cursor))) {
            return { streak: 0, anchorDate: null };
        }
    }

    while (true) {
        const key = toDateOnlyString(cursor);
        if (!logDates.has(key)) break;
        anchor = key;
        streak += 1;
        cursor = new Date(cursor.getTime() - ISO_DAY_MS);
    }

    return { streak, anchorDate: anchor };
}

function calculateWeeklyStreak(
    weekKeys: Set<string>,
    asOf: string
): { streak: number; anchorWeek: string | null } {
    const asOfDate = new Date(asOf);
    let currentWeek = getWeekStartKey(asOfDate);
    let anchor: string | null = null;
    let streak = 0;

    // If current week not completed, shift to previous week; if that is also missing, streak is zero.
    if (!weekKeys.has(currentWeek)) {
        const prevWeekDate = new Date(asOfDate);
        prevWeekDate.setDate(prevWeekDate.getDate() - 7);
        currentWeek = getWeekStartKey(prevWeekDate);
        if (!weekKeys.has(currentWeek)) {
            return { streak: 0, anchorWeek: null };
        }
    }

    while (true) {
        if (!weekKeys.has(currentWeek)) break;
        anchor = currentWeek;
        streak += 1;
        const prevWeek = new Date(currentWeek);
        prevWeek.setDate(prevWeek.getDate() - 7);
        currentWeek = getWeekStartKey(prevWeek);
    }

    return { streak, anchorWeek: anchor };
}

/**
 * Calculate the current streak for a habit as of a given date (default: today).
 * For daily habits: counts consecutive days; missing both today and yesterday resets streak.
 * For weekly habits: counts consecutive weeks with at least one completion; missing both this week and last resets streak.
 */
export function calculateHabitStreak(
    habitId: number,
    options: { asOf?: string } = {}
): { streak: number; frequency: HabitFrequency; lastCompletionDate: string | null } {
    const asOf = normalizeDateString(options.asOf);
    const habit = getHabitById(habitId);
    if (!habit) {
        return { streak: 0, frequency: 'daily', lastCompletionDate: null };
    }

    const logs = queryAll<HabitLogRecord>(
        `SELECT log_date, completed FROM habit_logs WHERE habit_id = ? AND completed = 1 ORDER BY log_date DESC;`,
        [habitId]
    );

    if (logs.length === 0) {
        return { streak: 0, frequency: habit.frequency ?? 'daily', lastCompletionDate: null };
    }

    const logDates = new Set(logs.map((l) => l.log_date));

    if (habit.frequency === 'weekly') {
        const weekKeys = new Set<string>();
        for (const log of logs) {
            weekKeys.add(getWeekStartKey(new Date(log.log_date)));
        }
        const { streak } = calculateWeeklyStreak(weekKeys, asOf);
        const lastCompletionDate = logs[0]?.log_date ?? null;
        return { streak, frequency: 'weekly', lastCompletionDate };
    }

    const { streak, anchorDate } = calculateDailyStreak(logDates, asOf);
    const lastCompletionDate = logs[0]?.log_date ?? anchorDate;
    return { streak, frequency: 'daily', lastCompletionDate };
}

/**
 * Close and reset the database connection (useful for tests).
 */
export function closeDatabase(): void {
    if (dbInstance) {
        dbInstance.closeSync();
        dbInstance = null;
        isInitialized = false;
    }
}

export type DateRangeCompletions = Record<string, { completed: boolean; count: number }>;

/**
 * Get completion status and progress count for a habit over a date range
 * @param habitId ID of the habit
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @returns Object with dates as keys and { completed, count } as values
 */
export function getHabitCompletionsForDateRange(
    habitId: number,
    startDate: string,
    endDate: string
): DateRangeCompletions {
    const db = getDatabase();
    const result: DateRangeCompletions = {};

    // Get all completions for this habit within the date range
    const logs = queryAll<{ log_date: string; completed: number; note: string | null }>(
        `SELECT log_date, completed, note FROM habit_logs 
         WHERE habit_id = ? AND log_date BETWEEN ? AND ? 
         ORDER BY log_date`,
        [habitId, startDate, endDate]
    );

    // Convert to a map for easy lookup
    const logMap = new Map<string, { completed: boolean; count: number }>();
    logs.forEach(log => {
        const count = log.note ? parseInt(log.note, 10) : (log.completed ? 1 : 0);
        logMap.set(log.log_date, {
            completed: log.completed === 1,
            count: isNaN(count) ? 0 : count
        });
    });

    // Generate all dates in range
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
        const dateStr = toDateOnlyString(currentDate);
        const logData = logMap.get(dateStr);
        result[dateStr] = logData || { completed: false, count: 0 };
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
}

export type HabitStats = {
    currentStreak: number;
    bestStreak: number;
    completionRate: number; // 0-100
    totalCompletions: number;
    totalPossible: number;
    lastCompleted: string | null;
};

/**
 * Get statistics for a habit
 * @param habitId ID of the habit
 * @returns Object containing various statistics about the habit
 */
export function getHabitStats(habitId: number): HabitStats {
    const db = getDatabase();
    const habit = getHabitById(habitId);
    if (!habit) {
        throw new Error(`Habit with ID ${habitId} not found`);
    }

    // Get all logs for this habit
    const logs = getHabitLogs(habitId);
    const completedLogs = logs.filter(log => log.completed === 1);

    // Calculate current streak
    const { streak: currentStreak } = calculateHabitStreak(habitId);

    // Calculate best streak
    let bestStreak = 0;
    let currentRun = 0;
    let lastDate: Date | null = null;

    // Sort logs by date
    const sortedLogs = [...logs].sort((a, b) =>
        new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
    );

    for (const log of sortedLogs) {
        if (log.completed !== 1) {
            bestStreak = Math.max(bestStreak, currentRun);
            currentRun = 0;
            continue;
        }

        const currentDate = new Date(log.log_date);
        if (lastDate) {
            const dayDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / ISO_DAY_MS);
            if (dayDiff === 1) {
                currentRun++;
            } else if (dayDiff > 1) {
                bestStreak = Math.max(bestStreak, currentRun);
                currentRun = 1;
            }
            // If same day, don't increment
        } else {
            currentRun = 1;
        }
        lastDate = currentDate;
    }
    bestStreak = Math.max(bestStreak, currentRun);

    // Calculate completion rate
    const totalPossible = Math.max(1, logs.length); // Avoid division by zero
    const completionRate = Math.round((completedLogs.length / totalPossible) * 100);

    // Get last completion date
    const lastCompletedLog = completedLogs.sort((a, b) =>
        new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    )[0];

    return {
        currentStreak,
        bestStreak,
        completionRate,
        totalCompletions: completedLogs.length,
        totalPossible: logs.length,
        lastCompleted: lastCompletedLog?.log_date || null,
    };
}

/**
 * Get all habits that should be shown for today
 * @returns Array of habits that should be shown today
 */
export function getTodaysHabits(): Array<HabitRecord & { completed: boolean }> {
    const today = toDateOnlyString(new Date());
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Get all active habits ordered by display_order
    const habits = getHabits({ includeArchived: false });

    // Get today's completions for all habits
    const habitIds = habits.map(h => h.id);
    const placeholders = habitIds.map(() => '?').join(',');

    const completedHabits = new Set<number>();
    if (habitIds.length > 0) {
        const db = getDatabase();
        const results = queryAll<{ habit_id: number }>(
            `SELECT habit_id FROM habit_logs 
             WHERE habit_id IN (${placeholders}) 
             AND log_date = ? AND completed = 1`,
            [...habitIds, today]
        );
        results.forEach(r => completedHabits.add(r.habit_id));
    }

    // Filter habits by frequency and map with completion status
    return habits
        .filter(habit => {
            if (habit.frequency === 'daily') return true;
            if (habit.frequency === 'weekly') {
                // For weekly habits, only show on the day after the start date's day of week
                if (!habit.start_date) return false;
                const startDay = new Date(habit.start_date).getDay();
                return dayOfWeek === startDay;
            }
            return false;
        })
        .map(habit => ({
            ...habit,
            completed: completedHabits.has(habit.id)
        }));
}

// ========================
// TO-DO LIST FUNCTIONS
// ========================

/**
 * Get all to-do items, sorted by display_order for pending tasks, then by creation date descending.
 * - Pending tasks: Always shown, ordered by display_order
 * - Completed tasks: Only shown if updated_at is today (or specific date)
 */
export function getToDos(date?: string): ToDoRecord[] {
    const targetDate = normalizeDateString(date);
    return queryAll<ToDoRecord>(
        `SELECT * FROM to_do 
         WHERE completed = 0 
            OR (completed = 1 AND date(updated_at) = ?)
         ORDER BY completed ASC, display_order ASC, created_at DESC;`,
        [targetDate]
    );
}

/**
 * Create a new to-do item and return its id.
 */
export function createToDo(task: string): number {
    const db = getDatabase();

    // Get the current max display_order for incomplete to-dos
    const maxOrderResult = db.getAllSync(
        `SELECT MAX(display_order) as max_order FROM to_do WHERE completed = 0`
    ) as { max_order: number | null }[];
    const nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

    const result = db.runSync(
        `INSERT INTO to_do (task, display_order) VALUES (?, ?)`,
        [task, nextOrder]
    );
    return Number(result.lastInsertRowId ?? 0);
}

/**
 * Update the task text of an existing to-do item.
 */
export function updateToDo(id: number, task: string): void {
    const db = getDatabase();
    db.runSync(
        `UPDATE to_do SET task = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
        [task, id]
    );
}

/**
 * Toggle the completion status of a to-do item.
 */
export function toggleToDoCompletion(id: number): void {
    const db = getDatabase();
    db.runSync(
        `UPDATE to_do SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END, updated_at = datetime('now', 'localtime') WHERE id = ?`,
        [id]
    );
}

/**
 * Delete a to-do item.
 */
export function deleteToDo(id: number): void {
    const db = getDatabase();
    db.runSync(`DELETE FROM to_do WHERE id = ?`, [id]);
}

// ========================
// NOTES FUNCTIONS
// ========================

/**
 * Get all notes, sorted by updated_at descending (newest edits first).
 */
export function getNotes(): NoteRecord[] {
    return queryAll<NoteRecord>(
        `SELECT * FROM notes ORDER BY updated_at DESC;`
    );
}

/**
 * Create a new note and return its id.
 */
export function createNote(title: string, content: string): number {
    const db = getDatabase();
    const result = db.runSync(
        `INSERT INTO notes (title, content) VALUES (?, ?)`,
        [title, content]
    );
    return Number(result.lastInsertRowId ?? 0);
}

/**
 * Update a note's title and content.
 */
export function updateNote(id: number, title: string, content: string): void {
    const db = getDatabase();
    db.runSync(
        `UPDATE notes SET title = ?, content = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`,
        [title, content, id]
    );
}

/**
 * Delete a note.
 */
export function deleteNote(id: number): void {
    const db = getDatabase();
    db.runSync(`DELETE FROM notes WHERE id = ?`, [id]);
}
// ========================
// CALENDAR HELPER FUNCTIONS
// ========================

/**
 * Get all habits for a specific date with their completion status on that date.
 * If the date is in the past, it checks the logs. 
 * If no log exists for a past date, it's considered incomplete.
 */
export function getHabitsForDate(date: string): Array<HabitRecord & { completed: boolean; progress: number }> {
    const targetDate = new Date(date + 'T00:00:00'); // Ensure proper date parsing
    const dayOfWeek = targetDate.getDay();
    const habits = getHabits({ includeArchived: false });

    // console.log(`[getHabitsForDate] Date: ${date}, DayOfWeek: ${dayOfWeek}, Total habits: ${habits.length}`);

    // 1. Filter applicable habits (daily vs weekly)
    const applicableHabits = habits.filter(habit => {
        // Relaxed start date check: compare YYYY-MM-DD strings directly if available
        const habitStartDate = habit.start_date ? habit.start_date.substring(0, 10) : null;
        if (habitStartDate && habitStartDate > date) return false;

        if (habit.frequency === 'daily') return true;
        if (habit.frequency === 'weekly') {
            if (!habitStartDate) return false;
            // Simple check: is the day of week the same?
            // Note: This assumes weekly habits trigger on the same day-of-week as they started.
            const startDay = new Date(habitStartDate + 'T00:00:00').getDay();
            return dayOfWeek === startDay;
        }
        return false;
    });

    // console.log(`[getHabitsForDate] Applicable habits: ${applicableHabits.length}`);

    if (applicableHabits.length === 0) return [];

    // 2. Get completion logs for this date
    const habitIds = applicableHabits.map(h => h.id);
    const placeholders = habitIds.map(() => '?').join(',');

    const results = queryAll<{ habit_id: number; completed: number; note: string | null }>(
        `SELECT habit_id, completed, note FROM habit_logs 
         WHERE habit_id IN (${placeholders}) 
         AND log_date = ?`,
        [...habitIds, date]
    );

    // Map of habit_id -> { completed, progress }
    const logMap = new Map<number, { completed: boolean; progress: number }>();
    results.forEach(r => {
        const progress = r.note ? parseInt(r.note, 10) : (r.completed ? 1 : 0);
        logMap.set(r.habit_id, {
            completed: r.completed === 1,
            progress: isNaN(progress) ? 0 : progress
        });
    });

    return applicableHabits.map(habit => {
        const log = logMap.get(habit.id);
        return {
            ...habit,
            completed: log?.completed ?? false,
            progress: log?.progress ?? 0
        };
    });
}

/**
 * Get to-do tasks for a specific date.
 * Shows tasks that were CREATED on this date.
 */
export function getToDosForDate(date: string): ToDoRecord[] {
    // console.log(`[getToDosForDate] Fetching tasks for date: ${date}`);

    // Use substr to extract just the date part from the datetime string
    const results = queryAll<ToDoRecord>(
        `SELECT * FROM to_do 
         WHERE substr(created_at, 1, 10) = ?
         OR (completed = 1 AND substr(updated_at, 1, 10) = ?)
         ORDER BY display_order ASC`,
        [date, date]
    );

    // console.log(`[getToDosForDate] Found ${results.length} tasks:`, results);

    return results;
}

/**
 * Get summary stats for a specific date (for calendar overview)
 */
export function getDateSummary(date: string): {
    habits: { total: number; completed: number };
    tasks: { total: number; completed: number };
} {
    const habits = getHabitsForDate(date);
    const tasks = getToDosForDate(date);

    return {
        habits: {
            total: habits.length,
            completed: habits.filter(h => h.completed).length
        },
        tasks: {
            total: tasks.length,
            completed: tasks.filter(t => t.completed === 1).length
        }
    };
}

/**
 * Get all dates in a month that have any activity (habits completed or tasks)
 */
export function getMonthActivity(year: number, month: number): Record<string, { habitsCompleted: number; tasksCompleted: number }> {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // console.log(`[getMonthActivity] Range: ${startDate} to ${endDate}`);

    const result: Record<string, { habitsCompleted: number; tasksCompleted: number }> = {};

    // Get habit completions for the month
    const habitLogs = queryAll<{ log_date: string; count: number }>(
        `SELECT log_date, COUNT(*) as count FROM habit_logs 
         WHERE log_date BETWEEN ? AND ? AND completed = 1
         GROUP BY log_date`,
        [startDate, endDate]
    );

    // console.log(`[getMonthActivity] Habit logs:`, habitLogs);

    habitLogs.forEach(log => {
        if (!result[log.log_date]) {
            result[log.log_date] = { habitsCompleted: 0, tasksCompleted: 0 };
        }
        result[log.log_date].habitsCompleted = log.count;
    });

    // Get task completions for the month
    const taskLogs = queryAll<{ date: string; count: number }>(
        `SELECT substr(created_at, 1, 10) as date, COUNT(*) as count FROM to_do 
         WHERE substr(created_at, 1, 10) BETWEEN ? AND ? AND completed = 1
         GROUP BY substr(created_at, 1, 10)`,
        [startDate, endDate]
    );

    // console.log(`[getMonthActivity] Task logs:`, taskLogs);

    taskLogs.forEach(log => {
        if (!result[log.date]) {
            result[log.date] = { habitsCompleted: 0, tasksCompleted: 0 };
        }
        result[log.date].tasksCompleted = log.count;
    });

    return result;

}

/**
 * Reorder to-dos based on their position in the array
 * @param todoIds Array of to-do IDs in the desired order
 */
export function reorderToDos(todoIds: number[]): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
        todoIds.forEach((id, index) => {
            db.runSync(
                `UPDATE to_do SET display_order = ? WHERE id = ?`,
                [index, id]
            );
        });
    });
}

/**
 * Reorder habits based on their position in the array
 * @param habitIds Array of habit IDs in the desired order
 */
export function reorderHabits(habitIds: number[]): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
        habitIds.forEach((id, index) => {
            db.runSync(
                `UPDATE habits SET display_order = ? WHERE id = ?`,
                [index, id]
            );
        });
    });
}