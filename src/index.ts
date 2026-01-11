import express, { type Request, type Response } from 'express';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import cors from 'cors';
import { google } from 'googleapis';
import path from 'path';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));


app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

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
    if (!id) throw new Error("Spreadsheet ID configuration missing");
    return id;
};

/**
 * PRODUCTION READY: Auto-Migration Logic
 * Detects new columns in the payload and alters MySQL table in real-time.
 */
async function ensureSchemaMatches(tableName: string, data: any) {
    const [columns]: any = await pool.query(`SHOW COLUMNS FROM ${tableName}`);
    const existingColumns = columns.map((col: any) => col.Field);

    for (const key of Object.keys(data)) {
        // Skip keys that shouldn't be DB columns
        if (key === 'id' || key === 'updated_at') continue;

        if (!existingColumns.includes(key)) {
            console.log(`Schema Drift Detected: Adding column [${key}] to ${tableName}`);
            // Using TEXT type for maximum flexibility with spreadsheet data
            await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ?? TEXT`, [key]);
        }
    }
}

/**
 * DB -> Sheet Sync
 * Handles Row identification and column mapping dynamically.
 */
async function syncDbToSheet(sync_id: string) {
    try {
        const spreadsheetId = getSpreadsheetId();
        const [rows]: any = await pool.query('SELECT * FROM users WHERE sync_id = ?', [sync_id]);
        if (rows.length === 0) return;

        const userData = rows[0];
        
        // Fetch current headers to ensure data alignment
        const sheetMetadata = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!1:1',
        });
        const headers = sheetMetadata.data.values?.[0] || [];

        // Find the correct row in Sheet
        const rowIndexData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Sheet1!A:A',
        });
        const rowsInSheet = rowIndexData.data.values || [];
        const rowIndex = rowsInSheet.findIndex(r => r[0] === sync_id) + 1;

        if (rowIndex > 0) {
            const valuesToUpdate = headers.map(h => userData[h] !== undefined ? userData[h].toString() : "");
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `Sheet1!A${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [valuesToUpdate] }
            });
            console.log(`Sync Successful: DB -> Sheet (ID: ${sync_id})`);
        }
    } catch (error) {
        console.error("DB to Sheet Sync Failed:", error);
    }
}

/**
 * Webhook: Sheet -> DB
 */
app.post('/webhook/sheet-update', async (req: Request, res: Response) => {
    const data = req.body;
    const { sync_id } = data;
    if (!sync_id) return res.status(400).json({ error: "Missing sync_id" });

    try {
        await ensureSchemaMatches('users', data);

        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');
        const updateStr = keys.map(key => `?? = VALUES(??)`).join(', ');
        
        // Prepare update assignments for ON DUPLICATE KEY
        const updateParams: string[] = [];
        keys.forEach(k => { updateParams.push(k); updateParams.push(k); });

        const sql = `
            INSERT INTO users (??) 
            VALUES (${placeholders}) 
            ON DUPLICATE KEY UPDATE ${updateStr}
        `;

        // Flatten parameters: [colNames, ...values, ...updateColPairs]
        await pool.query(sql, [keys, ...values, ...keys.flatMap(k => [k, k])]);
        
        console.log(`✅ Webhook: Sheet -> DB Updated (ID: ${sync_id})`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ status: 'error' });
    }
});

/**
 * API: Dashboard -> DB -> Sheet
 */
app.post('/api/update-user', async (req: Request, res: Response) => {
    const data = req.body;
    const { sync_id } = data;
    if (!sync_id) return res.status(400).json({ message: "sync_id required" });

    try {
        await ensureSchemaMatches('users', data);

        const keys = Object.keys(data).filter(k => k !== 'sync_id');
        const values = keys.map(k => data[k]);
        
        const sql = `UPDATE users SET ? WHERE sync_id = ?`;
        // mysql2 allows passing an object for 'SET ?'
        const [result]: any = await pool.query(sql, [data, sync_id]);

        if (result.affectedRows === 0) {
            // If ID doesn't exist, create it (Multiplayer support)
            await pool.query(`INSERT INTO users SET ?`, [data]);
        }

        await syncDbToSheet(sync_id);
        res.json({ message: "Synchronized update complete" });
    } catch (error) {
        console.error("Dashboard API Error:", error);
        res.status(500).json({ message: "Update failed" });
    }
});

app.get('/test-db-schema', async (req: Request, res: Response) => {
    try {
        const [columns]: any = await pool.query('SHOW COLUMNS FROM users');
        res.json({ columns: columns.map((col: any) => col.Field) });
    } catch (error) {
        res.status(500).json({ error: "Could not fetch schema" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));