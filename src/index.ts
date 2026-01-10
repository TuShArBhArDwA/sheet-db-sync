import express, { type Request, type Response } from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import cors from 'cors';
import { google } from 'googleapis';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0
});

const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const getSpreadsheetId = (): string => {
    const id = process.env.SPREADSHEET_ID;
    if (!id) throw new Error("Spreadsheet ID configuration missing in environment variables");
    return id;
};

/**
 * Ensures the database table structure matches the incoming data.
 * If a key exists in the data but not in the table, it adds a new column.
 */
async function ensureSchemaMatches(tableName: string, data: any) {
    const [columns]: any = await pool.query(`SHOW COLUMNS FROM ${tableName}`);
    const existingColumns = columns.map((col: any) => col.Field);

    for (const key of Object.keys(data)) {
        if (!existingColumns.includes(key)) {
            console.log(`Log: New column detected: ${key}. Migrating database...`);
            // Adding as TEXT for maximum compatibility with any data type from Sheets
            await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${key} TEXT`);
        }
    }
}

/**
 * Sync Logic: Database to Google Sheet
 * Dynamically fetches all columns for a record and updates the sheet.
 */
async function syncDbToSheet(sync_id: string) {
    console.log(`Log: Starting synchronization for ID ${sync_id}`);
    try {
        const spreadsheetId = getSpreadsheetId();

        const [rows]: any = await pool.query('SELECT * FROM users WHERE sync_id = ?', [sync_id]);
        if (rows.length === 0) return;

        const userData = rows[0];
        // Remove internal database timestamps if they exist
        delete userData.id;
        delete userData.updated_at;

        const sheetData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!1:1', // Fetch headers to map columns
        });

        const headers = sheetData.data.values?.[0] || [];
        const rowIndexData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:A',
        });

        const rowIndex = (rowIndexData.data.values || []).findIndex(row => row[0] === sync_id) + 1;

        if (rowIndex > 0) {
            // Map database values to the correct header positions in the sheet
            const valuesToUpdate = headers.map((header: string) => userData[header] || "");

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Sheet1!A${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [valuesToUpdate] }
            });
            console.log(`Log: Sheet synchronized for ID ${sync_id}`);
        }
    } catch (error) {
        console.error("Error: Sync failed:", (error as Error).message);
    }
}

/**
 * Webhook Endpoint: Dynamic Sheet -> Database
 */
app.post('/webhook/sheet-update', async (req: Request, res: Response) => {
    const data = req.body;
    const { sync_id } = data;

    if (!sync_id) return res.status(400).json({ error: "sync_id is required" });

    try {
        // 1. Check and update table schema if new columns exist in Sheet
        await ensureSchemaMatches('users', data);

        // 2. Build Dynamic UPSERT query
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');
        const updateStr = keys.map(key => `${key} = VALUES(${key})`).join(', ');

        const sql = `
            INSERT INTO users (${keys.join(', ')}) 
            VALUES (${placeholders}) 
            ON DUPLICATE KEY UPDATE ${updateStr}
        `;

        await pool.query(sql, values);
        console.log(`Log: Dynamic sync complete for ID ${sync_id}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Error: Webhook sync failed:', error);
        res.status(500).json({ status: 'error' });
    }
});

/**
 * API Endpoint: Dynamic Dashboard Update
 */
app.post('/api/update-user', async (req: Request, res: Response) => {
    const data = req.body;
    const { sync_id } = data;

    try {
        await ensureSchemaMatches('users', data);

        const keys = Object.keys(data).filter(k => k !== 'sync_id');
        const values = keys.map(k => data[k]);
        const setStr = keys.map(k => `${k} = ?`).join(', ');

        const sql = `UPDATE users SET ${setStr} WHERE sync_id = ?`;
        const [result]: any = await pool.query(sql, [...values, sync_id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Not found" });

        await syncDbToSheet(sync_id);
        res.json({ message: "Dynamic update successful" });
    } catch (error) {
        console.error("Error: Dashboard update failed:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get('/test-db', async (req: Request, res: Response) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        res.json({ status: 'success', test_result: rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
});


app.get('/test-db-schema', async (req: Request, res: Response) => {
    try {
        const [columns]: any = await pool.query('SHOW COLUMNS FROM users');
        const columnNames = columns.map((col: any) => col.Field);
        res.json({ columns: columnNames });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server Status: Online | Port: ${PORT}`);
});