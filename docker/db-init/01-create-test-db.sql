-- Runs once, when the coding-pgdata volume is first initialised.
-- Integration tests (npm test) use this database; it is truncated freely.
CREATE DATABASE coding_test;
