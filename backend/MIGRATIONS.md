
# VoxTask Pro - Database Migration Log

This file tracks all changes to the SQLite schema.

| Version | Date | Description | Affected Tables |
|:---|:---|:---|:---|
| 1.0 | 2024-05-20 | Initial Release | `users`, `tasks` |
| 1.1 | 2024-05-21 | Added email authentication support | `users` (added `password_hash`) |

## Guidelines
- Always use `ALTER TABLE ... ADD COLUMN ...` for minor updates to preserve existing data.
- If a major table restructure is required, create a temporary table, copy data, and swap.
- Document every change here before pushing to ensure team alignment.
