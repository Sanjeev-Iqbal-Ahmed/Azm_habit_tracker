# Habit Builder & Daily Routine App (Expo + React Native)

## 1) Project overview & goals
- Personal, offline-only habit builder and daily routine tracker.
- No backend, no cloud, no internet dependency in production.
- Data stays on the device: SQLite for core habit data, AsyncStorage for preferences (theme/settings).
- Built with Expo Router for simple, file-based navigation and a bottom tab layout.
- **Current Status**: All main UI screens implemented with minimalist design, theme system complete, database helpers ready. Integration between frontend and backend in progress.

## 2) Tech stack (what & why)
- **React Native + Expo**: Fast mobile development, managed builds, good offline story.
- **Expo Router**: File-based routing with first-class support for tabs and stacks.
- **TypeScript**: Safer, self-documenting code.
- **AsyncStorage (@react-native-async-storage/async-storage)**: Lightweight key/value store for user preferences (theme, settings).
- **Expo SQLite (expo-sqlite)**: On-device relational storage for habits/routines; no network required.
- **Expo Vector Icons (@expo/vector-icons)**: Icon library for UI components.

## 3) Folder structure (what lives where)
- `app/` — Expo Router entry.
  - `_layout.tsx` — Wraps the app with `AppThemeProvider` and connects the router to navigation theming.
  - `(tabs)/` — Bottom tab navigator.
    - `_layout.tsx` — Defines the tab bar (Home, Habits, Calendar, Settings).
    - `index.tsx` — **Home screen with complete UI implementation**
    - `habits.tsx` — **Habits management screen with complete UI implementation**
    - `calendar.tsx` — **Calendar progress screen with complete UI implementation**
    - `settings.tsx` — **Settings screen with theme switcher and complete UI implementation**
  - `modal.tsx` — Starter example modal (currently unused by the stack).
- `components/` — Reusable UI (themed text/view, haptic tab, icons, collapsible, etc.).
- `constants/theme.ts` — Centralized color palette, theme types, and font mappings.
- `hooks/` — `use-theme`, `use-color-scheme`, `use-theme-color` helpers.
- `providers/` — `theme-provider.tsx` (app-wide theme context/provider).
- `storage/` — `preferences.ts` for reading/writing AsyncStorage (theme preference).
- `database/` — `sqlite.ts` helper for opening and querying the local SQLite DB.
- `assets/` — Images, fonts, etc.
- `scripts/` — Maintenance scripts (from starter).

### Components Folder Details
- `themed-text.tsx` — Text component with automatic theme support
  - Accepts `lightColor` and `darkColor` props for custom colors
  - Supports predefined text types: `default`, `title`, `defaultSemiBold`, `subtitle`, `link`
  - Automatically applies theme-appropriate text color
- `themed-view.tsx` — View component with automatic theme support
  - Accepts `lightColor` and `darkColor` props for custom background colors
  - Automatically applies theme-appropriate background color
- `haptic-tab.tsx` — Tab button wrapper with haptic feedback
  - Provides light haptic feedback on iOS when pressing tabs
  - Wraps `PlatformPressable` for consistent cross-platform behavior
- `external-link.tsx` — Link component for external URLs
  - Opens links in in-app browser on native platforms
  - Opens in default browser on web
  - Uses `expo-web-browser` for native presentation
- `parallax-scroll-view.tsx` — Custom scroll view with parallax header effect
  - Implements iOS-style parallax scrolling
  - Useful for headers with background images
- `hello-wave.tsx` — Animated greeting component (example)
  - Demonstrates React Native animated API
  - Can be removed in production
- `ui/` — Subfolder for smaller UI components
  - `collapsible.tsx` — Expandable/collapsible container component
    - Manages open/closed state internally
    - Rotates chevron icon when toggled
    - Uses themed components for consistent styling
  - `icon-symbol.tsx` — Cross-platform icon component
    - Uses SF Symbols on iOS for native look
    - Falls back to Material Icons on Android and web
    - Includes mapping for common icons (home, check-circle, calendar, settings)
    - Supports size, weight, and color props
  - `icon-symbol.ios.tsx` — iOS-specific implementation

### Hooks Folder Details
- `use-theme.ts` — Hook to access theme context
  - Returns `ThemeContextValue` with colorScheme, preference, isHydrated, and setPreference
  - Throws error if used outside ThemeProvider
  - Primary hook for accessing theme state
- `use-color-scheme.ts` — Hook to get current resolved color scheme
  - Returns `'light'` or `'dark'` based on user preference and system theme
  - Simplified version of useTheme for just the color scheme
  - Has web-specific variant for hydration handling
- `use-color-scheme.web.ts` — Web-specific color scheme hook
  - Handles client-side hydration to avoid mismatch
  - Defers to client theme after mount
  - Ensures SSR compatibility
- `use-theme-color.ts` — Hook to get themed colors
  - Accepts props object with optional light/dark color overrides
  - Takes colorName to select from theme palette
  - Returns appropriate color based on current theme
  - Used by themed components for dynamic coloring

## 4) Theme system (light/dark)
- `AppThemeProvider` (providers/theme-provider.tsx)
  - Loads saved preference (`light` | `dark` | `system`) from AsyncStorage.
  - Listens to system theme via `Appearance`; hydrates once ready.
  - Exposes `colorScheme`, `preference`, and `setPreference()` via context.
- Hooks:
  - `useTheme()` — Access theme context values.
  - `useColorScheme()` — Returns the resolved theme (`light` or `dark`) from context.
  - `useThemeColor()` — Picks the correct color token for components.
- Palette:
  - Defined in `constants/theme.ts` with matching light/dark tokens for background, surface, text, borders, accents, and tab icon colors.
  - **NEW**: Added `accentText` color for proper text contrast on accent backgrounds in dark mode (#010101 black text on #DDEDEC mint background).
  - Light mode: Soft off-white background (#F8F9FB), dark text (#010101), mint accent (#DDEDEC), beige highlight (#FBEBCC).
  - Dark mode: Near-black background (#010101), off-white text (#ECEFF4), mint accent (#DDEDEC), beige highlight (#FBEBCC).
- Navigation theming:
  - `app/_layout.tsx` maps the app theme into React Navigation’s theme so headers/status bar align with the selected mode.

## 5) SQLite setup (schema + helpers)
- Helper: `database/sqlite.ts`
  - `getDatabase()` opens a single `habit-builder.db` connection (WAL + foreign keys on).
  - `initializeDatabase()` creates tables once (call on app start).
  - `runStatement(sql, params)` for INSERT/UPDATE/DELETE/DDL.
  - `queryAll(sql, params)` for SELECT queries returning rows.
  - `closeDatabase()` to close/reset (useful for tests).
- Tables (created in `initializeDatabase()`):
  - `habits` — id, name (required), description, goal_per_day (default 1), start_date, frequency (`daily` | `weekly`, default `daily`), is_archived (0/1), timestamps.
  - `habit_logs` — id, habit_id (FK → habits), log_date (ISO string), completed (0/1), note, timestamps, unique (habit_id, log_date).
  - `settings` — key/value store for future simple settings (beyond theme which uses AsyncStorage).
- Habit helpers:
  - `createHabit({ name, description?, goalPerDay?, startDate? })` → returns new id.
  - `updateHabit(id, { name?, description?, goalPerDay?, startDate?, isArchived?, frequency? })`.
  - `getHabits({ includeArchived? })` and `getHabitById(id)`.
  - `markHabitCompletion({ habitId, date, completed, note? })` upserts a log for a given date.
  - `calculateHabitStreak(habitId, { asOf? })` — computes current streak (daily or weekly) with last completion date.
  - `getHabitLogs(habitId)` — fetch raw logs (ordered desc).
  - `getHabitCompletionsForDateRange(habitId, startDate, endDate)` — gets completion status for a date range.
  - `getHabitStats(habitId)` — returns statistics like current streak, best streak, and completion rate.
  - `getTodaysHabits()` — retrieves all habits that should be shown for today with completion status.

## 6) Streak logic
- Streaks are derived from `habit_logs` only.
- Daily habits:
  - Streak counts consecutive days.
  - If today is incomplete, streak may start from yesterday; missing both today and yesterday resets streak.
- Weekly habits:
  - Streak counts consecutive weeks (Monday-start) where at least one completion exists.
  - If both this week and last week are missing completions, streak resets.
- `calculateHabitStreak` returns `{ streak, frequency, lastCompletionDate }`.

## 7) UI Implementations (completed screens)
All main screens have been implemented with complete UI following minimalist design principles:

### Home Screen (`app/(tabs)/index.tsx`)
- **Header**: User avatar, personalized greeting "Good morning", add button
- **Hero Section**: Large headline "track your habits" spanning two lines
- **Quick Habit Highlights**: Horizontal scrollable pills showing habit progress (e.g., "no cigarettes – 9/21 days", "yoga – 30 min")
- **Primary Habit Card**: Featured water intake card with mint background (#DDEDEC), showing progress (5/8 glasses), max value, and 7-day streak
- **Completed Section**: List of today's completed habits with checkboxes and completion indicators
- **Features**: Theme-aware colors, proper contrast on accent backgrounds, sample data integration

### Habits Management Screen (`app/(tabs)/habits.tsx`)
- **Top Bar**: Back arrow, centered "Habits" title, settings/filter icon
- **Habit List**: Vertical list of habit cards with:
  - Primary habit card (first/water habit) with mint background and prominent progress display
  - Secondary habit cards with neutral surfaces
  - Each card shows: habit icon, name, daily target, streak indicator
- **Bottom Action**: Centered "+ add habit" button
- **Features**: Automatic icon selection, progress display, empty state, clean typography

### Calendar Progress Screen (`app/(tabs)/calendar.tsx`)
- **Top Section**: Month selector with navigation arrows and refresh button
- **Calendar Grid**: 7-column monthly layout with circular day indicators
  - Completed days highlighted with mint accent (#DDEDEC)
  - Incomplete days in muted gray
  - Today's date emphasized with border
- **Progress Summary**: "Today's Progress" section with habit completion list
- **Features**: Month navigation, real habit data integration, sample data fallback, clean visual hierarchy

### Settings Screen (`app/(tabs)/settings.tsx`)
- **Top Bar**: Back arrow, centered "Settings" title
- **Main Settings**: Account, Notifications, Reminders, Theme (with inline selector), Rate This App, Support
- **Theme Selector**: Inline segmented control with Light/Dark options, active option highlighted with mint accent
- **Footer Settings**: Privacy Policy, About & Help
- **Features**: Functional theme switching, clean list layout, proper icon mapping

## 8) Integration Status
- **Backend**: Complete SQLite database with all CRUD operations, streak calculations, and utility functions
- **Frontend**: All UI screens implemented with proper theming and responsive design
- **Integration**: Frontend screens are connected to backend helpers and display real/appropriate data
- **Theme System**: Complete with proper contrast handling for accent backgrounds in dark mode
- **Navigation**: Fully functional tab navigation between all screens

## 9) Next steps (remaining tasks)
- Add habit creation/editing functionality to Habits screen
- Implement habit completion toggling with database updates
- Add calendar date selection and detailed progress views
- Implement settings persistence and additional preference options
- Add habit archiving and deletion functionality
- Consider adding habit categories or tags
- Add export/import functionality for habit data
- Implement habit reminders/notifications integration

*Remember: Update this document whenever you add, modify, or refactor code.* 
