import { getDatabase, queryAll } from './sqlite';
import * as SQLite from 'expo-sqlite';

export type PaymentRecord = {
    id: number;
    name: string;
    to_pay: number;
    to_get: number;
    display_order: number;
    created_at: string;
    updated_at: string;
};

/**
 * Initialize the payments table
 */
export function initializePaymentsTable(): void {
    const db = getDatabase();
    db.runSync(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      to_pay REAL DEFAULT 0,
      to_get REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`);
}

/**
 * Create a new payment entry
 */
export function createPayment(data: { name: string }): number {
    const db = getDatabase();

    // Get the current max display_order to append new payment at the end
    const maxOrderResult = db.getAllSync(
        `SELECT MAX(display_order) as max_order FROM payments`
    ) as { max_order: number | null }[];
    const nextOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

    // console.log('Creating payment with display_order:', nextOrder);

    const result = db.runSync(
        `INSERT INTO payments (name, to_pay, to_get, display_order) VALUES (?, 0, 0, ?)`,
        [data.name, nextOrder]
    );
    const newId = Number(result.lastInsertRowId ?? 0);
    // console.log('Payment created in DB with ID:', newId);
    return newId;
}

/**
 * Get all payment entries ordered by display_order
 */
export function getAllPayments(): PaymentRecord[] {
    // console.log('Querying all payments from database...');
    const results = queryAll<PaymentRecord>(
        `SELECT * FROM payments ORDER BY display_order ASC, created_at DESC;`
    );
    // console.log('Query returned:', results.length, 'payments');
    return results;
}

/**
 * Get a specific payment by ID
 */
export function getPaymentById(id: number): PaymentRecord | null {
    const db = getDatabase();
    const rows = db.getAllSync(
        `SELECT * FROM payments WHERE id = ? LIMIT 1`,
        [id]
    ) as PaymentRecord[];
    return rows[0] ?? null;
}

/**
 * Update payment amounts
 */
export function updatePaymentAmounts(
    id: number,
    updates: { toPay?: number; toGet?: number }
): void {
    const db = getDatabase();
    const fields: string[] = [];
    const values: SQLite.SQLiteBindParams = [];

    if (updates.toPay !== undefined) {
        fields.push('to_pay = ?');
        values.push(updates.toPay);
    }
    if (updates.toGet !== undefined) {
        fields.push('to_get = ?');
        values.push(updates.toGet);
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = datetime('now', 'localtime')`);
    values.push(id);

    db.runSync(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`, values);
}

/**
 * Delete a payment entry
 */
export function deletePayment(id: number): void {
    const db = getDatabase();
    db.runSync(`DELETE FROM payments WHERE id = ?`, [id]);
}

/**
 * Update the display order for all payments based on their position in the array
 * @param paymentIds Array of payment IDs in the desired order
 */
export function reorderPayments(paymentIds: number[]): void {
    const db = getDatabase();
    db.withTransactionSync(() => {
        paymentIds.forEach((id, index) => {
            db.runSync(
                `UPDATE payments SET display_order = ? WHERE id = ?`,
                [index, id]
            );
        });
    });
}
