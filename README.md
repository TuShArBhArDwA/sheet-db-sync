# High-Performance Bi-Directional Sync: MySQL & Google Sheets

A production-grade synchronization engine that bridges the gap between structured SQL databases and flexible Google Sheets. This solution is designed for **scale, multiplayer usage, and dynamic data structures.**

---

## Submission Links

- **GitHub Repository:** [https://github.com/TuShArBhArDwA/sheet-db-sync](https://github.com/TuShArBhArDwA/sheet-db-sync)
- **Video Walkthrough:** soon
- **Live Dashboard:** [https://sheet-db-sync.vercel.app](https://sheet-db-sync.vercel.app)

---

## Technical Depth & Implementation

### 1. Dynamic Schema Auto-Migration (Any Structure, Any Type)

This system treats Google Sheets as a living schema.

- **Drift Detection:** The engine compares the incoming Sheet payload with the MySQL Information Schema.
- **Just-In-Time Migration:** If a user adds a new column (e.g., `Department`) in the Sheet, the backend automatically executes an `ALTER TABLE` command in MySQL to create the column with `TEXT` flexibility in real-time.

### 2. Headless UI Generation

The frontend dashboard is **schema-agnostic**. Instead of hardcoded forms, it queries the database metadata to dynamically render input fields. This ensures that when the spreadsheet structure evolves, the management interface updates itself without a single line of code change.

### 3. Optimized for Multiplayer & Scale (Bonus Requirement)

To handle concurrent usage by multiple team members:

- **Connection Pooling:** Implemented `mysql2` pooling to manage database connections efficiently under load.
- **Atomic Upserts:** Utilizes `ON DUPLICATE KEY UPDATE` (Upsert) logic. This ensures that if two users edit the same record simultaneously, the database resolves the state idempotently without creating duplicate entries.
- **Service Account Integration:** Uses Google Server-to-Server authentication, bypassing the need for individual user OAuth and providing a stable, high-quota pipe for data.

---

## System Architecture

1. **Sheet → DB:** Google Apps Script `onEdit` trigger ➔ Ngrok Webhook ➔ Express.js ➔ MySQL Upsert.
2. **Dashboard → Sheet:** React/HTML Frontend ➔ Express API ➔ MySQL Update ➔ Google Sheets API v4 ➔ Sheet Row Update.

---

## Nuances & Edge Cases Handled

| Feature                        | Handling Strategy                                                                                                                                                                         |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Circular Sync Loops**        | Implemented logic to ensure updates pushed from the Dashboard to the Sheet do not trigger the Sheet's webhook back to the DB, preventing infinite loops.                                  |
| **Data Persistence Guardrail** | While schema migration is additive (adding columns), **destructive migration (dropping columns)** is intentionally disabled to prevent accidental data loss from spreadsheet human error. |
| **Column Reordering**          | Data mapping is performed via **Header Keys** rather than column indices. The system remains functional even if a user moves "Email" from Column B to Column E.                           |
| **Primary Key Integrity**      | The `sync_id` is treated as a persistent anchor. If a user deletes a row and re-adds it, the system re-links it based on this unique identifier.                                          |
| **Type Resilience**            | All incoming data is sanitized and cast as strings/text in the DB migration to accommodate the "untyped" nature of Google Sheets cells.                                                   |

---

## Setup & Installation

1.  **Clone & Install:**

    ```bash
    git clone https://github.com/TuShArBhArDwA/sheet-db-sync.git
    npm install
    ```

2.  **Environment Setup:**
    Environment Setup: Create a `.env` file based on the provided template:

    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=your_db
    SPREADSHEET_ID=your_id
    ```

3.  Service Account: Place your `service-account.json` in the root directory.

4.  **Run:**
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
