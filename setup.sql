-- setup.sql
-- Run this in Supabase → SQL editor to create required tables and example policies

-- 1) Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- 2) Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id serial PRIMARY KEY,
  group_id integer REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid,
  sender_name text,
  content text,
  file_url text,
  file_name text,
  created_at timestamptz DEFAULT now()
);

-- OPTIONAL: enable RLS (Row-Level Security) if you plan to use policies
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Example policies (use for testing). Adjust for production.
-- Allow anyone (including anon) to read groups
CREATE POLICY IF NOT EXISTS "Public select groups" ON public.groups
  FOR SELECT USING (true);

-- Allow authenticated users to insert new groups
CREATE POLICY IF NOT EXISTS "Auth insert groups" ON public.groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow anyone to read messages (public chat)
CREATE POLICY IF NOT EXISTS "Allow select messages" ON public.messages
  FOR SELECT USING (true);

-- Allow authenticated users to insert messages
CREATE POLICY IF NOT EXISTS "Allow insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Notes:
-- - For production tighten policies (e.g. require auth.uid() = created_by for updates/deletes)
-- - Run these snippets in the SQL editor and reload your app afterwards
