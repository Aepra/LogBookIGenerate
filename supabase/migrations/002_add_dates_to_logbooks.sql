-- Add start_date and end_date columns to logbooks table
ALTER TABLE logbooks 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Update RLS policies (already covered by existing policies on logbooks)