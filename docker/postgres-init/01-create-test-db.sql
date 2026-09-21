-- Runs once when the postgres volume is first created. The e2e suite uses
-- this database (see .env.test) so tests never touch the dev data in `hotel`.
CREATE DATABASE hotel_test;
