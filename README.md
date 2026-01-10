# High-Performance Bi-Directional Sync: MySQL & Google Sheets

A production-grade synchronization engine that bridges the gap between structured SQL databases and flexible Google Sheets. This solution is designed for **scale, multiplayer usage, and dynamic data structures.**

---

## Demo & Submission Links

* **GitHub Repository:** [https://github.com/TuShArBhArDwA/sheet-db-sync](https://github.com/TuShArBhArDwA/sheet-db-sync)
* **Video Walkthrough:** `[Insert Your Loom/Drive Video Link Here]`
* **Live Dashboard:** `[Insert Your Hosted/Tunnel Link Here]`

---

## Key Features & Technical Depth

### 1. Dynamic Schema Auto-Migration 🛠️
Unlike basic sync tools, this system handles **Any Structure, Any Type**.
* **Auto-Detection:** If a user adds a new column (e.g., `Phone`) in the Google Sheet header, the engine detects the "Schema Drift."
* **Auto-Migration:** The backend automatically executes an `ALTER TABLE` command in MySQL to create the missing column in real-time.

### 2. Intelligent Bi-Directional Propagation 🔄
* **Sheet ➔ DB:** Real-time updates via Google Apps Script Webhooks.
* **DB ➔ Sheet:** Updates triggered via the Dashboard API with atomic row-matching logic.

### 3. Dynamic UI Generation 💻
The frontend dashboard is **headless**. It queries the MySQL schema and dynamically renders the appropriate input fields, ensuring the UI always reflects the database state.

### 4. Multiplayer & Scale Optimization ⚡
* **Connection Pooling:** Uses `mysql2` connection pools to handle concurrent writes from multiple users without dropping connections.
* **Upsert Logic:** Uses `ON DUPLICATE KEY UPDATE` to prevent primary key conflicts and ensure idempotency.

---

## Nuances & Edge Cases Handled

| Edge Case | Solution |
| :--- | :--- |
| **Schema Drift** | System treats Sheet Row 1 as the source of truth and migrates the DB to match. |
| **Infinite Loop Prevention** | Webhook triggers are isolated from API updates to prevent circular sync loops. |
| **Rate Limiting** | Implements basic error handling for Google Sheets API v4 quota limits. |
| **Data Integrity** | Uses a required `sync_id` to maintain a persistent link between records even if the Sheet is sorted. |
| **Type Safety** | Built entirely in TypeScript to prevent runtime data-type mismatches. |

---

## Architecture

The system uses a **Node.js/Express** backbone with **Service Account** authentication for secure, server-to-server communication.



---

## Setup & Installation

1.  **Clone & Install:**
    ```bash
    git clone [https://github.com/TuShArBhArDwA/sheet-db-sync.git](https://github.com/TuShArBhArDwA/sheet-db-sync.git)
    npm install
    ```

2.  **Environment Setup:**
    Create a `.env` file (see `.env.example`):
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=your_db
    SPREADSHEET_ID=your_id
    ```

3.  **Run:**
    ```bash
    npm run dev
    ```
---

## Sponsor

If you find this helpful, consider supporting me:

- **Sponsor Me:** [Buy Me a Coffee!](https://github.com/sponsors/TuShArBhArDwA)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Contact

- **Meet T-Bot** - [Discover My Work](https://t-bot-blush.vercel.app/)
- **Tushar Bhardwaj** - [Portfolio](https://tushar-bhardwaj.vercel.app/)
- **Connect 1:1** - [Topmate](https://topmate.io/tusharbhardwaj)
- **GitHub:** [TuShArBhArDwA](https://github.com/TuShArBhArDwA)
- **LinkedIn:** [Tushar Bhardwaj](https://www.linkedin.com/in/bhardwajtushar2004/)
- **Email:** [tusharbhardwaj2617@example.com](mailto:tusharbhardwaj2617@example.com)
