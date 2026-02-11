# Habit Builder - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Core Features](#core-features)
5. [Database Schema](#database-schema)
6. [Theme System](#theme-system)
7. [API Reference](#api-reference)
8. [Setup & Installation](#setup--installation)
9. [Future Improvements](#future-improvements)

## Project Overview

Habit Builder is a mobile-first application designed to help users build and track daily and weekly habits. The app focuses on simplicity and offline functionality, ensuring users can track their habits without an internet connection. Data is stored locally using SQLite for habits and logs, while user preferences are managed via AsyncStorage.

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Database**: SQLite (via expo-sqlite)
- **Local Storage**: @react-native-async-storage/async-storage
- **Styling**: React Native StyleSheet with theme support
- **Type Safety**: TypeScript
- **Build Tool**: Expo CLI

## Project Structure

### `/app` - Application Entry Point
- `_layout.tsx` - Root layout component that initializes the database and sets up theme providers
- `(tabs)/` - Tab-based navigation structure
  - `_layout.tsx` - Tab navigator configuration
  - `index.tsx` - Home screen
  - `habits.tsx` - Habits management screen
  - `calendar.tsx` - Calendar view for habit tracking
  - `settings.tsx` - User settings screen
  - `explore.tsx` - Example/placeholder screen (can be removed)
- `modal.tsx` - Example modal screen (unused in current implementation)

### `/assets` - Static Assets
- `fonts/` - Custom font files
- `images/` - Image assets used throughout the app

### `/components` - Reusable UI Components
- `themed-text.tsx` - Text component with theme support
- `themed-view.tsx` - View component with theme support
- `external-link.tsx` - External link component
- `haptic-tab.tsx` - Tab component with haptic feedback
- `hello-wave.tsx` - Example animated component
- `parallax-scroll-view.tsx` - Custom scroll view with parallax effect
- `ui/` - Smaller UI components
  - `collapsible.tsx` - Expandable/collapsible container
  - `icon-symbol.tsx` - Icon component using system symbols

### `/constants` - Application Constants
- `theme.ts` - Color palettes, typography, and theme-related constants

### `/database` - Database Layer
- `sqlite.ts` - Database initialization, schema, and CRUD operations
  - Manages SQLite connection
  - Defines database schema and tables
  - Provides functions for habit and log management
  - Implements streak calculation logic

### `/hooks` - Custom React Hooks
- `use-theme.ts` - Hook to access theme context
- `use-color-scheme.ts` - Hook to get current color scheme
- `use-theme-color.ts` - Hook to get themed colors

### `/providers` - Context Providers
- `theme-provider.tsx` - Manages app-wide theme state and preferences

### `/storage` - Local Storage
- `preferences.ts` - Handles reading/writing user preferences to AsyncStorage

## Core Features

### Habit Management
- Create, read, update, and delete habits
- Set daily or weekly frequency
- Track completion status
- Add notes to habit completions

### Streak Tracking
- Automatic streak calculation
- Supports both daily and weekly habits
- Smart streak maintenance (forgiveness for missing a day)

### Theming
- Light and dark mode support
- System theme synchronization
- Customizable color schemes

## Database Schema

### `habits` Table
- `id` (INTEGER, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `description` (TEXT, NULLABLE)
- `goal_per_day` (INTEGER, DEFAULT 1)
- `start_date` (TEXT, NULLABLE)
- `frequency` (TEXT, DEFAULT 'daily')
- `is_archived` (INTEGER, DEFAULT 0)
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)

### `habit_logs` Table
- `id` (INTEGER, PRIMARY KEY)
- `habit_id` (INTEGER, FOREIGN KEY)
- `log_date` (TEXT, NOT NULL)
- `completed` (INTEGER, DEFAULT 0)
- `note` (TEXT, NULLABLE)
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP)

### `settings` Table
- `key` (TEXT, PRIMARY KEY)
- `value` (TEXT)

## Theme System

The app uses a centralized theming system with the following characteristics:
- Light and dark color palettes
- Consistent color tokens (primary, background, text, etc.)
- Automatic system theme detection
- Manual theme override option
- Smooth transitions between themes

## API Reference

### Database Functions

#### Habit Management
- `createHabit(data)`: Create a new habit
- `updateHabit(id, updates)`: Update an existing habit
- `getHabits(options)`: Get all habits (with optional archive filter)
- `getHabitById(id)`: Get a single habit by ID
- `markHabitCompletion(params)`: Record habit completion for a specific date
- `calculateHabitStreak(habitId, options)`: Calculate current streak for a habit

#### Log Management
- `getHabitLogs(habitId)`: Get all logs for a habit
- `getHabitCompletionsForDateRange(habitId, startDate, endDate)`: Get completion status for a habit over a date range
  - Returns: `Record<string, boolean>` where keys are dates in YYYY-MM-DD format and values indicate completion status
- `getHabitStats(habitId)`: Get statistics for a habit
  - Returns: `{ currentStreak: number, bestStreak: number, completionRate: number, totalCompletions: number, totalPossible: number, lastCompleted: string | null }`
- `getTodaysHabits()`: Get all habits that should be shown for today with completion status
  - Returns: `Array<HabitRecord & { completed: boolean }>`

## Setup & Installation

1. **Prerequisites**
   - Node.js (v14 or later)
   - npm or yarn
   - Expo CLI (`npm install -g expo-cli`)

2. **Install Dependencies**
   ```bash
   cd habit-builder
   npm install
   # or
   yarn install
   ```

3. **Run the App**
   ```bash
   npx expo start
   ```
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app (mobile)

## Future Improvements

1. **UI/UX Enhancements**
   - Animated habit completion
   - Custom icon selection
   - Habit categories/tags

2. **Features**
   - Habit reminders
   - Data export/backup
   - Achievement badges
   - Habit statistics and insights

3. **Technical**
   - Unit and integration tests
   - Performance optimization
   - Offline sync capability
   - Error tracking

4. **Accessibility**
   - Improved screen reader support
   - Dynamic text sizing
   - High contrast mode

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT License](LICENSE)

---

*Documentation last updated: December 2025*
