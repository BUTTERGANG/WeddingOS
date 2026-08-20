---
name: Existing database schema sync
description: Safe schema-change handling for the imported WeddingOS PostgreSQL database.
---

The current Drizzle Kit schema push is incompatible with PostgreSQL databases
that expose named `NOT NULL` constraints, including constraints on primary-key
columns. It incorrectly proposes dropping them and PostgreSQL rejects the
operation for primary-key IDs.

**Why:** The configured WeddingOS database already has the complete expected
table set. Forcing the generated change would risk changing a populated
database without a reliable migration path.

**How to apply:** Treat a failed push containing `DROP CONSTRAINT
..._id_not_null` as a tooling-compatibility issue, not an empty-schema setup
step. Verify the existing schema first and create or test a safe migration
strategy before applying changes.