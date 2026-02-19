import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

// Initialize Database
export const initDatabase = async () => {
    try {
        db = await SQLite.openDatabaseAsync('musicquiz.db');

        await db.execAsync(`
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                highScore INTEGER DEFAULT 0
            );
        `);

        // Check if admin exists
        const adminCheck = await db.getAllAsync('SELECT * FROM users WHERE email = ?', ['admin@admin.com']);
        if (adminCheck.length === 0) {
            await db.runAsync(
                'INSERT INTO users (email, password, name, role, highScore) VALUES (?, ?, ?, ?, ?)',
                ['admin@admin.com', 'admin', 'Admin User', 'admin', 0]
            );
            console.log('Default admin created.');
        }
    } catch (error) {
        console.error("DB Init Error:", error);
    }
};

// User Operations

// Get user by email (for login)
export const getUserByEmail = (email: string) => {
    if (!db) return null;
    try {
        const user = db.getAllSync('SELECT * FROM users WHERE email = ?', [email]);
        return user.length > 0 ? user[0] : null;
    } catch (error) {
        console.error("Error getting user by email:", error);
        return null;
    }
};

// Create new user
export const createUser = (email: string, password: string, name: string, role: string = 'user') => {
    if (!db) throw new Error("DB not ready");
    try {
        const result = db.runSync(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            [email, password, name, role]
        );
        return result.lastInsertRowId;
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
};

// Get all users (for Admin Dashboard)
export const getAllUsers = () => {
    if (!db) return [];
    return db.getAllSync('SELECT * FROM users ORDER BY id DESC');
};

// Update user
export const updateUser = (id: number, name: string, email: string, role: string, score: number) => {
    if (!db) return;
    db.runSync(
        'UPDATE users SET name = ?, email = ?, role = ?, highScore = ? WHERE id = ?',
        [name, email, role, score, id]
    );
};

// Delete user
export const deleteUser = (id: number) => {
    if (!db) return;
    db.runSync('DELETE FROM users WHERE id = ?', [id]);
};

// Update High Score
export const updateHighScore = (id: number, score: number) => {
    if (!db) return;
    const user = db.getAllSync('SELECT highScore FROM users WHERE id = ?', [id]);
    if (user.length > 0 && (user[0] as any).highScore < score) {
        db.runSync('UPDATE users SET highScore = ? WHERE id = ?', [score, id]);
    }
};

// Get Leaderboard
export const getLeaderboard = () => {
    if (!db) return [];
    return db.getAllSync('SELECT name, highScore FROM users ORDER BY highScore DESC LIMIT 10');
};

export { db };
