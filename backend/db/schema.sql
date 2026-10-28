-- ============================================================================
-- Supabase History Persistence Schema
-- NetPulse AI 5G Digital Twin Network Simulator
-- 
-- Purpose: Store simulation history for replay, analysis, and export
-- Features: Multi-allocator support, AI explanations, real-time metrics
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Table: simulation_runs
-- Purpose: Stores metadata for each simulation execution
-- Tracks configuration, status, timing, and QoS metrics for comparison
-- ============================================================================
CREATE TABLE IF NOT EXISTS simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config JSONB NOT NULL,                    -- Full simulation configuration
    status TEXT NOT NULL,                     -- "running", "completed", "stopped"
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,                     -- NULL while running
    total_ticks INTEGER DEFAULT 0,
    avg_baseline_qos FLOAT,                   -- Average baseline QoS score
    avg_ai_qos FLOAT,                         -- Average AI QoS score
    qos_improvement FLOAT                     -- QoS improvement percentage
);

-- Index for chronological queries (newest first)
CREATE INDEX IF NOT EXISTS idx_simulation_runs_start_time ON simulation_runs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_status ON simulation_runs(status);

-- ============================================================================
-- Table: tick_snapshots
-- Purpose: Stores network state captured at specific simulation ticks
-- Contains demands, allocations, and metrics for baseline and AI
-- ============================================================================
CREATE TABLE IF NOT EXISTS tick_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    tick INTEGER NOT NULL,                    -- Simulation tick number (0-based)
    timestamp TIMESTAMPTZ NOT NULL,
    demands JSONB NOT NULL,                   -- Traffic demands by user type
    baseline_result JSONB NOT NULL,           -- Baseline allocation result
    ai_result JSONB NOT NULL,                 -- AI allocation result
    congestion_level FLOAT NOT NULL           -- Congestion level (0.0-1.0)
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_tick_snapshots_run_id ON tick_snapshots(run_id);
CREATE INDEX IF NOT EXISTS idx_tick_snapshots_tick ON tick_snapshots(tick);
CREATE INDEX IF NOT EXISTS idx_tick_snapshots_run_tick ON tick_snapshots(run_id, tick);

-- ============================================================================
-- Table: groq_decisions
-- Purpose: Stores AI strategic recommendations from Groq API integration
-- Links decisions to specific simulation runs and ticks
-- ============================================================================
CREATE TABLE IF NOT EXISTS groq_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    tick INTEGER NOT NULL,                    -- Tick when decision was generated
    timestamp TIMESTAMPTZ NOT NULL,
    reasoning TEXT NOT NULL,                  -- AI reasoning and explanation
    recommended_weights JSONB NOT NULL        -- Recommended priority weights by user type
);

-- Index for fast retrieval of all decisions for a run
CREATE INDEX IF NOT EXISTS idx_groq_decisions_run_id ON groq_decisions(run_id);
CREATE INDEX IF NOT EXISTS idx_groq_decisions_tick ON groq_decisions(tick);

-- ============================================================================
-- Optional: Row Level Security (RLS) Policies
-- Uncomment these if you want to enable RLS for production
-- ============================================================================

-- Enable RLS on all tables (commented out for development)
-- ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tick_snapshots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE groq_decisions ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for development/testing)
-- CREATE POLICY "Allow all operations" ON simulation_runs FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON tick_snapshots FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON groq_decisions FOR ALL USING (true);

-- ============================================================================
-- Notes:
-- - UUID primary keys support distributed systems and avoid ID conflicts
-- - JSONB columns provide flexible storage for complex nested data
-- - TIMESTAMPTZ ensures timezone-aware timestamps for accurate replay
-- - ON DELETE CASCADE ensures cleanup when simulation runs are deleted
-- - Indexes optimize common query patterns (chronological listing, run lookups)
-- - IF NOT EXISTS prevents errors if tables already exist
-- - RLS policies are commented out for easier development
-- ============================================================================
