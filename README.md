Study Hub — Local setup

This small app uses Supabase for auth, storage, realtime, and database.

Quick steps to run locally safely (do not commit keys):

1. Create a local config file

   - Copy `supabase-config.js` from this folder (it's a template).
   - Edit it and set your values from Supabase project settings -> API:
     - `SUPABASE_URL` (Project URL)
     - `SUPABASE_ANON_KEY` (Anon public key)
   - Save the file next to `index.html`.

   Example `supabase-config.js` (fill the values):

   window.SUPABASE_CONFIG = {
     SUPABASE_URL: 'https://your-project-id.supabase.co',
     SUPABASE_ANON_KEY: 'pk.eyJ...'
   };

   NOTE: The anon key is intended for client-side use only. Never include service_role keys here.

2. Serve the folder over HTTP (don't use file://)

   Option A — Python 3 (recommended, available on many systems):

   ```powershell
   python -m http.server 5500
   ```

   Option B — Node (npx):

   ```powershell
   npx serve -l 5500
   ```

   Then open: http://localhost:5500

3. Troubleshooting

   - If you see "Supabase URL or ANON Key are placeholders" in the app, double-check that `supabase-config.js` is present and contains `window.SUPABASE_CONFIG` with correct values.
   - Use the browser DevTools Console and Network tab to see failing requests. Common causes of "Failed to fetch": wrong URL, offline server, CORS when serving from file://, or invalid keys.

4. Want me to plug the keys in for you?

   - If you'd like, paste your `SUPABASE_URL` and `SUPABASE_ANON_KEY` here and I can (optionally) add them to `supabase-config.js` for you.
   - Do NOT paste service_role keys — only the anon/public key.

If you want, I can also add a `.gitignore` entry to avoid accidentally committing the config file.

Database Row-Level Security (RLS) and policies
----------------------------------------------

If you can create groups but they don't show up for other users (or even for yourself after creation), the most common cause is Row-Level Security (RLS) on the table blocking SELECT/INSERT operations for the anon/public role. Use the Supabase SQL editor to run the following SQL to create the `groups` table (if you haven't already) and add permissive policies for testing.

1) Create the `groups` table (if missing):

```sql
-- Simple groups table
CREATE TABLE public.groups (
   id serial PRIMARY KEY,
   name text NOT NULL,
   description text,
   created_by uuid,
   created_at timestamptz DEFAULT now()
);
```

2) (Optional) Enable RLS explicitly (new tables may have it enabled by default):

```sql
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
```

3) Add example policies — for testing, allow authenticated users to INSERT and allow anyone to SELECT:

```sql
-- Allow anyone (including anon) to read groups (safe for public lists)
CREATE POLICY "Public select groups" ON public.groups
   FOR SELECT USING (true);

-- Allow authenticated users to insert new groups
CREATE POLICY "Auth insert groups" ON public.groups
   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

Notes:
- For production, tighten policies (e.g., require `auth.uid() = created_by` for updates/deletes).
- If you prefer only authenticated users to read groups, change the SELECT policy to `USING (auth.role() = 'authenticated')`.
- After adding policies, reload the app page so the client sees the changes.

Messages and storage
--------------------
If you plan to use the chat functionality, you'll also need a `messages` table and appropriate policies. Example:

```sql
CREATE TABLE public.messages (
   id serial PRIMARY KEY,
   group_id integer REFERENCES public.groups(id) ON DELETE CASCADE,
   user_id uuid,
   sender_name text,
   content text,
   file_url text,
   file_name text,
   created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select messages in group" ON public.messages
   FOR SELECT USING (true);

CREATE POLICY "Allow insert messages" ON public.messages
   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

Run these snippets in the Supabase SQL editor (Project → SQL) and then reload your app. If you still see missing items, open DevTools → Network and check the request to `/rest/v1/groups` (or check the Console for errors) and paste them here — I can help diagnose further.
