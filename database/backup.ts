import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';
import { closeDatabase, getDatabase, initializeDatabase } from './sqlite';

/**
 * Returns the base native path and file:// URI for the SQLite database.
 * expo-sqlite gives a native path like /data/user/0/.../databases
 * expo-file-system needs a file:// URI.
 */
function getDatabasePaths(): { fileUri: string } {
    const dbName = 'habit-builder.db';
    const rawDir = SQLite.defaultDatabaseDirectory;

    // Strip any trailing slash
    const baseDir = rawDir.endsWith('/') ? rawDir.slice(0, -1) : rawDir;
    const nativePath = `${baseDir}/${dbName}`;
    // Build a file:// URI only if not already prefixed
    const fileUri = nativePath.startsWith('file://') ? nativePath : `file://${nativePath}`;

    return { fileUri };
}

export async function exportDatabase() {
    try {
        const { fileUri } = getDatabasePaths();

        // ── Step 1: Checkpoint the WAL so all data is flushed into the main .db file ──
        // CRITICAL when journal_mode = WAL — without this the exported file is empty.
        const db = getDatabase();
        db.execSync('PRAGMA wal_checkpoint(TRUNCATE);');

        // ── Step 2: Verify the file actually exists ──
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
            Alert.alert('Error', `Database file not found at:\n${fileUri}`);
            return;
        }

        // ── Step 3: Copy to cache with a descriptive filename for the share sheet ──
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const tempPath = `${FileSystem.cacheDirectory}habit-builder-backup-${timestamp}.db`;
        await FileSystem.copyAsync({ from: fileUri, to: tempPath });

        // ── Step 4: Open the native share/save dialog ──
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(tempPath, {
                mimeType: 'application/octet-stream',
                dialogTitle: 'Save Database Backup',
                UTI: 'public.database', // iOS hint
            });
        } else {
            Alert.alert('Error', 'Sharing is not available on this device.');
        }
    } catch (error: any) {
        console.error('Error exporting database:', error);
        Alert.alert('Export Failed', error.message || 'An unexpected error occurred during export.');
    }
}

export async function importDatabase(onSuccess?: () => void) {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return;
        }

        const pickedFile = result.assets[0];

        // Basic sanity check on file name
        if (!pickedFile.name.endsWith('.db') && !pickedFile.name.includes('habit-builder')) {
            Alert.alert(
                'Unexpected File',
                `"${pickedFile.name}" does not look like a database backup. Proceed anyway?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Proceed',
                        style: 'destructive',
                        onPress: () => performImport(pickedFile.uri, onSuccess),
                    },
                ]
            );
            return;
        }

        await performImport(pickedFile.uri, onSuccess);
    } catch (error: any) {
        console.error('Error picking file:', error);
        Alert.alert('Import Failed', error.message || 'Failed to read the selected file.');
    }
}

async function performImport(sourceUri: string, onSuccess?: () => void) {
    try {
        const { fileUri } = getDatabasePaths();

        // ── Step 1: Safely close the active DB connection ──
        closeDatabase();

        // ── Step 2: Delete stale WAL / SHM sidecar files ──
        // These belong to the OLD database. If left behind, SQLite will replay them
        // on top of the newly imported .db, corrupting the restore.
        const walUri = `${fileUri}-wal`;
        const shmUri = `${fileUri}-shm`;
        const walInfo = await FileSystem.getInfoAsync(walUri);
        const shmInfo = await FileSystem.getInfoAsync(shmUri);
        if (walInfo.exists) await FileSystem.deleteAsync(walUri, { idempotent: true });
        if (shmInfo.exists) await FileSystem.deleteAsync(shmUri, { idempotent: true });

        // ── Step 3: Overwrite the main .db file with the chosen backup ──
        await FileSystem.copyAsync({ from: sourceUri, to: fileUri });

        // ── Step 4: Re-open and re-initialize ──
        initializeDatabase();

        Alert.alert('Import Successful', 'Your data has been restored from the backup!', [
            {
                text: 'OK',
                onPress: () => {
                    if (onSuccess) onSuccess();
                },
            },
        ]);
    } catch (error: any) {
        console.error('Error importing database:', error);
        Alert.alert('Import Failed', error.message || 'An error occurred while importing the database.');
        // Best-effort re-init so the app is not left in a broken state
        try { initializeDatabase(); } catch {}
    }
}
