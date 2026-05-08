
-- Add session + first-login fields to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS must_change_pin boolean NOT NULL DEFAULT true;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS session_token text;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS session_expires_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS app_users_session_token_idx ON public.app_users(session_token) WHERE session_token IS NOT NULL;

-- Enable RLS on app_users (was not enabled) and grant no public access
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Drop the public-facing view if it exists (we'll list users via server fn)
DROP VIEW IF EXISTS public.app_user_names;

-- Lock down projects & attachments: drop wide-open policies
DROP POLICY IF EXISTS "projects readable by anyone" ON public.projects;
DROP POLICY IF EXISTS "projects insertable by anyone" ON public.projects;
DROP POLICY IF EXISTS "projects updatable by anyone" ON public.projects;
DROP POLICY IF EXISTS "projects deletable by anyone" ON public.projects;

DROP POLICY IF EXISTS "attachments readable by anyone" ON public.attachments;
DROP POLICY IF EXISTS "attachments insertable by anyone" ON public.attachments;
DROP POLICY IF EXISTS "attachments updatable by anyone" ON public.attachments;
DROP POLICY IF EXISTS "attachments deletable by anyone" ON public.attachments;

-- RLS stays enabled with no policies => anon/authenticated have no access.
-- Server functions use the service-role client to bypass RLS.

-- Lock down storage bucket: remove any public-read policies if present
-- (we'll serve files via signed URLs from the server)
UPDATE storage.buckets SET public = false WHERE id = 'attachments';

DROP POLICY IF EXISTS "Public read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public delete attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete attachments" ON storage.objects;
