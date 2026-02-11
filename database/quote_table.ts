/**
 * Quote database operations
 * Manages Quranic verses retrieval only
 */

import { getDatabase } from './sqlite';

export interface QuoteRecord {
    id: number;
    verse_no: string;
    verse: string;
    created_at: string;
    updated_at: string;
}

/**
 * Get a random quote from the database
 */
export function getRandomQuote(): QuoteRecord | null {
    const db = getDatabase();
    const quote = db.getFirstSync<QuoteRecord>(
        'SELECT * FROM quotes ORDER BY RANDOM() LIMIT 1'
    );
    return quote || null;
}

/**
 * Get all quotes
 */
export function getAllQuotes(): QuoteRecord[] {
    const db = getDatabase();
    return db.getAllSync<QuoteRecord>(
        'SELECT * FROM quotes ORDER BY verse_no ASC'
    );
}

/**
 * Get a specific quote by ID
 */
export function getQuoteById(id: number): QuoteRecord | null {
    const db = getDatabase();
    const quote = db.getFirstSync<QuoteRecord>(
        'SELECT * FROM quotes WHERE id = ?',
        [id]
    );
    return quote || null;
}
