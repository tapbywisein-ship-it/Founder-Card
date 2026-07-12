-- 010: drop the unused password_reset_tokens table.
-- Password resets are handled entirely by Supabase Auth
-- (resetPasswordForEmail on the frontend); no backend code has ever
-- queried this table. Idempotent — safe to re-run.
DROP TABLE IF EXISTS password_reset_tokens;
