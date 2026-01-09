# Sheet ↔ MySQL Sync Engine

A production-grade bi-directional synchronization system between Google Sheets and MySQL with real-time conflict handling.

---

## 📌 Problem Statement

Build a system that maintains a live two-way data sync between a Google Sheet and a MySQL database. Any change made in one system should be reflected in the other system in near real-time.

The system is designed to be schema-agnostic, reliable under concurrent edits, and safe from infinite update loops.

---

## 🧠 High-Level Architecture

Google Sheets and MySQL act as independent data sources. A central Sync Service detects changes from both systems, normalizes updates, resolves conflicts, and propagates changes safely.

Google Sheets <--> Sync Service <--> MySQL



---

## ⚙️ Core Features

- Bi-directional data synchronization
- Schema-agnostic table handling
- Infinite loop prevention using source tracking
- Conflict resolution using timestamp-based last-write-wins
- Multiplayer Google Sheets edit handling
- Simple UI for real-time testing and visibility

---

## 🧩 Assumptions

- A single Google Sheet maps to a single MySQL table
- Each row has a unique primary key
- Timestamps are available for conflict resolution
- Last-write-wins strategy is acceptable for conflicts

---

## 🚧 Work in Progress

This project is being developed as part of the FDE Internship assignment at Superjoin.

---

## 📄 License

MIT
