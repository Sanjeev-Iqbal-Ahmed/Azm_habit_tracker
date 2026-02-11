# Habit Builder Database Documentation

## Overview
The Habit Builder application uses SQLite with Write-Ahead Logging (WAL) mode for improved concurrency. Foreign key constraints are enabled to maintain referential integrity.

**Database File:** `habit-builder.db`

---

## Database Tables

### 1. `habits` Table
Stores the main habit definitions and configurations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique habit identifier |
| `name` | TEXT | NOT NULL | Name of the habit |
| `description` | TEXT | NULL | Optional detailed description |
| `goal_per_day` | INTEGER | DEFAULT 1 | Daily goal count (for tracking multiple completions) |
| `start_date` | TEXT | NULL | ISO date (YYYY-MM-DD) when habit tracking began |
| `frequency` | TEXT | DEFAULT 'daily' | Either 'daily' or 'weekly' |
| `is_archived` | INTEGER | DEFAULT 0 | 0 = active, 1 = archived |
| `created_at` | TEXT | DEFAULT (datetime('now')) | Timestamp when habit was created |
| `updated_at` | TEXT | DEFAULT (datetime('now')) | Timestamp of last update |

**Indexes:** None (primary key index exists by default)

---

### 2. `habit_logs` Table
Records daily completion status and notes for each habit.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique log entry identifier |
| `habit_id` | INTEGER | NOT NULL, FOREIGN KEY | References `habits(id)` |
| `log_date` | TEXT | NOT NULL | ISO date (YYYY-MM-DD) of the log entry |
| `completed` | INTEGER | NOT NULL, DEFAULT 0 | 0 = not completed, 1 = completed |
| `note` | TEXT | NULL | Optional note about the day's activity |
| `created_at` | TEXT | DEFAULT (datetime('now')) | Timestamp when log was created |
| `updated_at` | TEXT | DEFAULT (datetime('now')) | Timestamp of last update |

**Constraints:**
- `UNIQUE (habit_id, log_date)` - One log entry per habit per day
- `FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE` - Deleting a habit removes all its logs

**Indexes:**
- `idx_habit_logs_habit_date` on `(habit_id, log_date)` - Optimizes queries by habit and date range

---

### 3. `settings` Table
Stores application-level configuration as key-value pairs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | TEXT | PRIMARY KEY | Unique setting identifier |
| `value` | TEXT | NULL | Setting value stored as text |

**Note:** Currently defined in schema but not actively used in the provided code.

---

## Table Relationships

```
┌─────────────────┐
│     habits      │
│─────────────────│
│ • id (PK)       │
│   name          │
│   description   │
│   goal_per_day  │
│   start_date    │
│   frequency     │
│   is_archived   │
│   created_at    │
│   updated_at    │
└────────┬────────┘
         │
         │ 1:N
         │ ON DELETE CASCADE
         │
         ▼
┌─────────────────┐
│   habit_logs    │
│─────────────────│
│ • id (PK)       │
│ • habit_id (FK) │──┐
│   log_date      │  │ UNIQUE CONSTRAINT
│   completed     │  │ (habit_id, log_date)
│   note          │  │
│   created_at    │  │
│   updated_at    │◄─┘
└─────────────────┘

┌─────────────────┐
│    settings     │
│─────────────────│
│ • key (PK)      │
│   value         │
└─────────────────┘
(Independent table)
```

---

## Key Design Patterns

### 1. **One-to-Many Relationship**
- Each habit can have multiple log entries (one per day)
- Cascade deletion ensures log entries are removed when a habit is deleted

### 2. **Soft Delete Pattern**
- Habits use `is_archived` flag instead of hard deletion
- Allows users to hide habits without losing historical data

### 3. **Upsert Pattern**
- Log entries use `ON CONFLICT` clause for idempotent updates
- Prevents duplicate entries for the same habit on the same day

### 4. **Date Storage**
- All dates stored as TEXT in ISO 8601 format (YYYY-MM-DD)
- Enables proper string-based date comparisons in SQL

---

## Common Query Patterns

### Streak Calculation Logic

**Daily Habits:**
- Consecutive days with `completed = 1`
- Streak continues if today OR yesterday is completed
- Missing both today and yesterday resets the streak

**Weekly Habits:**
- Groups completions by week (Monday-Sunday)
- Counts consecutive weeks with at least one completion
- Streak continues if current week OR last week has completion

### Frequency-Based Display

**Daily Habits:**
- Show every day

**Weekly Habits:**
- Only display on the same day of week as `start_date`
- Example: If started on Monday, only show on Mondays

---

## Data Integrity Features

1. **Foreign Key Enforcement:** `PRAGMA foreign_keys = ON`
2. **WAL Mode:** Better concurrency for multiple transactions
3. **Unique Constraints:** Prevent duplicate logs for same date
4. **Cascade Deletion:** Automatic cleanup of related records
5. **Default Timestamps:** Automatic tracking of creation/modification times

---

## Statistics Calculations

The database supports various statistics:

- **Current Streak:** Based on most recent consecutive completions
- **Best Streak:** Longest consecutive completion period ever
- **Completion Rate:** Percentage of logged days that were completed
- **Total Completions:** Count of all completed log entries
- **Date Range Completions:** Map of completion status for any date range

---

---

## API Functions Reference

### Database Initialization & Connection

#### `getDatabase(): SQLiteDatabase`
Returns the singleton database connection instance. Creates and configures the database on first call.

**Configuration:**
- Enables WAL (Write-Ahead Logging) mode for better concurrency
- Enables foreign key constraints

**Usage:**
```typescript
const db = getDatabase();
```

---

#### `initializeDatabase(): void`
Creates all database tables and indexes. Safe to call multiple times (idempotent).

**Creates:**
- `habits` table with default values
- `habit_logs` table with foreign key constraint
- `settings` table
- Index on `habit_logs(habit_id, log_date)`

**Migration:**
- Attempts to add `frequency` column for backward compatibility

**Usage:**
```typescript
initializeDatabase(); // Call once at app startup
```

---

#### `closeDatabase(): void`
Closes the database connection and resets initialization state. Primarily used for testing.

**Usage:**
```typescript
closeDatabase(); // Cleanup in tests
```

---

### Low-Level Query Functions

#### `runStatement(sql: string, params?: SQLiteBindParams): void`
Executes a parameterized SQL statement (INSERT, UPDATE, DELETE, DDL).

**Parameters:**
- `sql` - SQL statement with `?` placeholders
- `params` - Array of values to bind to placeholders

**Usage:**
```typescript
runStatement('DELETE FROM habits WHERE id = ?', [5]);
```

---

#### `queryAll<T>(sql: string, params?: SQLiteBindParams): T[]`
Executes a SELECT query and returns all matching rows as typed objects.

**Parameters:**
- `sql` - SELECT statement with `?` placeholders
- `params` - Array of values to bind

**Returns:** Array of objects matching the query

**Usage:**
```typescript
const habits = queryAll<HabitRecord>('SELECT * FROM habits WHERE is_archived = ?', [0]);
```

---

### Habit Management Functions

#### `createHabit(data: {...}): number`
Creates a new habit record and returns its ID.

**Parameters:**
- `name` (required) - Habit name
- `description` (optional) - Detailed description
- `goalPerDay` (optional, default: 1) - Daily goal count
- `startDate` (optional) - ISO date string (YYYY-MM-DD)
- `frequency` (optional, default: 'daily') - 'daily' or 'weekly'

**Returns:** The new habit's ID

**Usage:**
```typescript
const habitId = createHabit({
  name: 'Morning Meditation',
  description: '10 minutes of mindfulness',
  goalPerDay: 1,
  frequency: 'daily'
});
```

---

#### `updateHabit(id: number, updates: {...}): void`
Updates specific fields of an existing habit. Only provided fields are updated.

**Parameters:**
- `id` - Habit ID to update
- `updates` - Object with fields to update:
  - `name` - New habit name
  - `description` - New description
  - `goalPerDay` - New daily goal
  - `startDate` - New start date
  - `isArchived` - Archive status (boolean)
  - `frequency` - 'daily' or 'weekly'

**Automatically updates:** `updated_at` timestamp

**Usage:**
```typescript
updateHabit(5, { 
  name: 'Evening Meditation',
  isArchived: false 
});
```

---

#### `getHabits(options?: {...}): HabitRecord[]`
Retrieves all habits, optionally including archived ones.

**Parameters:**
- `includeArchived` (optional, default: false) - Include archived habits

**Returns:** Array of habit records ordered by creation date (newest first)

**Usage:**
```typescript
const activeHabits = getHabits();
const allHabits = getHabits({ includeArchived: true });
```

---

#### `getHabitById(id: number): HabitRecord | null`
Retrieves a single habit by ID.

**Returns:** Habit record or `null` if not found

**Usage:**
```typescript
const habit = getHabitById(5);
if (habit) {
  console.log(habit.name);
}
```

---

#### `getTodaysHabits(): Array<HabitRecord & { completed: boolean }>`
Gets all habits that should be displayed today with their completion status.

**Filtering Logic:**
- **Daily habits:** Always included
- **Weekly habits:** Only shown on the same day of week as `start_date`
- **Archived habits:** Excluded

**Returns:** Array of habits with added `completed` boolean field

**Usage:**
```typescript
const todaysHabits = getTodaysHabits();
todaysHabits.forEach(habit => {
  console.log(`${habit.name}: ${habit.completed ? '✓' : '○'}`);
});
```

---

### Habit Log Functions

#### `getHabitLogs(habitId: number): HabitLogRecord[]`
Retrieves all log entries for a specific habit.

**Returns:** Array of log records ordered by date (newest first)

**Usage:**
```typescript
const logs = getHabitLogs(5);
console.log(`Total logs: ${logs.length}`);
```

---

#### `markHabitCompletion(params: {...}): void`
Records or updates completion status for a habit on a specific date.

**Parameters:**
- `habitId` - Habit ID
- `date` - ISO date string (YYYY-MM-DD)
- `completed` - Boolean completion status
- `note` (optional) - Text note for the day

**Behavior:** Uses UPSERT pattern - creates new log or updates existing one

**Usage:**
```typescript
markHabitCompletion({
  habitId: 5,
  date: '2025-12-27',
  completed: true,
  note: 'Felt great today!'
});
```

---

#### `getHabitCompletionsForDateRange(habitId: number, startDate: string, endDate: string): DateRangeCompletions`
Gets completion status for every day in a date range.

**Parameters:**
- `habitId` - Habit ID
- `startDate` - ISO date string (inclusive)
- `endDate` - ISO date string (inclusive)

**Returns:** Object with date strings as keys and boolean completion status as values

**Usage:**
```typescript
const completions = getHabitCompletionsForDateRange(5, '2025-12-01', '2025-12-31');
// Result: { '2025-12-01': true, '2025-12-02': false, ... }
```

---

### Streak Calculation Functions

#### `calculateHabitStreak(habitId: number, options?: {...}): {...}`
Calculates the current streak for a habit based on consecutive completions.

**Parameters:**
- `habitId` - Habit ID
- `asOf` (optional, default: today) - Calculate streak as of this date

**Returns:**
- `streak` - Current streak count
- `frequency` - 'daily' or 'weekly'
- `lastCompletionDate` - Most recent completion date or null

**Daily Streak Logic:**
- Counts consecutive days with completions
- Streak continues if today OR yesterday is completed
- Missing both resets streak to 0

**Weekly Streak Logic:**
- Counts consecutive weeks with at least one completion
- Week starts on Monday
- Streak continues if current week OR last week has completion
- Missing both resets streak to 0

**Usage:**
```typescript
const { streak, frequency, lastCompletionDate } = calculateHabitStreak(5);
console.log(`Current ${frequency} streak: ${streak}`);
```

---

#### `getHabitStats(habitId: number): HabitStats`
Calculates comprehensive statistics for a habit.

**Returns:**
- `currentStreak` - Current consecutive completion streak
- `bestStreak` - Longest streak ever achieved
- `completionRate` - Percentage of logged days completed (0-100)
- `totalCompletions` - Total number of completed logs
- `totalPossible` - Total number of log entries
- `lastCompleted` - Most recent completion date or null

**Throws:** Error if habit not found

**Usage:**
```typescript
const stats = getHabitStats(5);
console.log(`Completion rate: ${stats.completionRate}%`);
console.log(`Best streak: ${stats.bestStreak} days`);
console.log(`Current streak: ${stats.currentStreak} days`);
```

---

### Helper Functions (Internal)

These utility functions are used internally by the API:

#### `toDateOnlyString(date: Date): string`
Converts a JavaScript Date to ISO date string (YYYY-MM-DD).

#### `normalizeDateString(dateString?: string): string`
Returns provided date string or today's date if undefined.

#### `getWeekStartKey(date: Date): string`
Calculates the Monday of the week containing the given date. Used for weekly habit tracking.

#### `calculateDailyStreak(logDates: Set<string>, asOf: string): {...}`
Internal function that computes daily streak from a set of completion dates.

#### `calculateWeeklyStreak(weekKeys: Set<string>, asOf: string): {...}`
Internal function that computes weekly streak from a set of week start dates.

---

## Function Usage Patterns

### Creating and Tracking a Habit

```typescript
// 1. Initialize database (once at app start)
initializeDatabase();

// 2. Create a new habit
const habitId = createHabit({
  name: 'Read for 30 minutes',
  frequency: 'daily',
  startDate: '2025-12-01'
});

// 3. Mark completion for today
markHabitCompletion({
  habitId,
  date: '2025-12-27',
  completed: true,
  note: 'Finished chapter 5'
});

// 4. Check streak
const { streak } = calculateHabitStreak(habitId);
console.log(`Current streak: ${streak} days`);
```

### Displaying Today's Habits

```typescript
const habits = getTodaysHabits();

habits.forEach(habit => {
  const icon = habit.completed ? '✓' : '○';
  console.log(`${icon} ${habit.name}`);
  
  if (habit.frequency === 'weekly') {
    console.log('  (Weekly habit - only shown today)');
  }
});
```

### Viewing Habit Analytics

```typescript
const stats = getHabitStats(habitId);

console.log(`📊 Statistics for: ${habit.name}`);
console.log(`Current Streak: ${stats.currentStreak} days`);
console.log(`Best Streak: ${stats.bestStreak} days`);
console.log(`Completion Rate: ${stats.completionRate}%`);
console.log(`Total Completions: ${stats.totalCompletions}/${stats.totalPossible}`);
```

### Getting Calendar Data

```typescript
// Get completions for the entire month
const completions = getHabitCompletionsForDateRange(
  habitId,
  '2025-12-01',
  '2025-12-31'
);

// Render calendar
Object.entries(completions).forEach(([date, completed]) => {
  console.log(`${date}: ${completed ? '✓' : '○'}`);
});
```

---

## Notes

- The `settings` table is defined but not actively used in the current implementation
- The `goal_per_day` field exists but the current UI primarily treats habits as binary (done/not done)
- The `frequency` column was added via migration, with a fallback for older database versions
- All date parameters and returns use ISO 8601 format (YYYY-MM-DD) for consistency
- The database uses a singleton pattern - only one connection exists throughout the app lifecycle