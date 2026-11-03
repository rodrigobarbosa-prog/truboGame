CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  canonical_name TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  best_route TEXT NOT NULL,
  best_progress INTEGER NOT NULL CHECK(best_progress BETWEEN 0 AND 10000),
  best_milliseconds INTEGER NOT NULL,
  best_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
  player_id TEXT NOT NULL REFERENCES players(id),
  id TEXT NOT NULL,
  route TEXT NOT NULL,
  progress INTEGER NOT NULL CHECK(progress BETWEEN 0 AND 10000),
  milliseconds INTEGER NOT NULL,
  reason TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  location TEXT NOT NULL,
  date TEXT NOT NULL,
  PRIMARY KEY(player_id,id)
);
CREATE INDEX IF NOT EXISTS ranking_order ON players(best_route,best_progress DESC,best_milliseconds,best_date);
