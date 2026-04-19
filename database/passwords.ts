import type * as SQLite from 'expo-sqlite';

import { getDatabase, queryAll } from './sqlite';

export type PasswordEntryRecord = {
    id: number;
    name: string;
    username: string | null;
    password: string;
    note: string | null;
    created_at: string;
    updated_at: string;
};

let isPasswordsInitialized = false;

export function initializePasswordsTable(): void {
    if (isPasswordsInitialized) return;

    const db = getDatabase();

    db.withTransactionSync(() => {
        db.runSync(`CREATE TABLE IF NOT EXISTS password_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT,
      password TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`);
    });

    isPasswordsInitialized = true;
}

export function createPasswordEntry(data: {
    name: string;
    username?: string | null;
    password: string;
    note?: string | null;
}): number {
    initializePasswordsTable();

    const db = getDatabase();
    const result = db.runSync(
        `INSERT INTO password_entries (name, username, password, note)
     VALUES (?, ?, ?, ?)`,
        [data.name, data.username ?? null, data.password, data.note ?? null]
    );

    return Number(result.lastInsertRowId ?? 0);
}

export function getPasswordEntries(): PasswordEntryRecord[] {
    initializePasswordsTable();

    return queryAll<PasswordEntryRecord>(
        `SELECT * FROM password_entries ORDER BY updated_at DESC, created_at DESC;`
    );
}

export function updatePasswordEntry(
    id: number,
    updates: Partial<{
        name: string;
        username: string | null;
        password: string;
        note: string | null;
    }>
): void {
    initializePasswordsTable();

    const db = getDatabase();

    const fields: string[] = [];
    const values: SQLite.SQLiteBindParams = [];

    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.username !== undefined) {
        fields.push('username = ?');
        values.push(updates.username ?? null);
    }
    if (updates.password !== undefined) {
        fields.push('password = ?');
        values.push(updates.password);
    }
    if (updates.note !== undefined) {
        fields.push('note = ?');
        values.push(updates.note ?? null);
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = datetime('now', 'localtime')`);
    values.push(id);

    db.runSync(`UPDATE password_entries SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deletePasswordEntry(id: number): void {
    initializePasswordsTable();

    const db = getDatabase();
    db.runSync('DELETE FROM password_entries WHERE id = ?', [id]);
}
