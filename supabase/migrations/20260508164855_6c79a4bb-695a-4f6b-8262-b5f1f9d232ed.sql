
-- App users (3 hardcoded team members with 4-digit PINs)
CREATE TABLE public.app_users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL
);

INSERT INTO public.app_users (name, pin) VALUES
  ('Boss', '1111'),
  ('Estimator 1', '2222'),
  ('Estimator 2', '3333');

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Public can read names only via a view; direct table access blocked for client
CREATE VIEW public.app_user_names AS SELECT id, name FROM public.app_users;
GRANT SELECT ON public.app_user_names TO anon, authenticated;

-- Projects
CREATE TABLE public.projects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  bid_due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Taking Off',
  notes TEXT,
  claimed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects readable by anyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects insertable by anyone" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "projects updatable by anyone" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "projects deletable by anyone" ON public.projects FOR DELETE USING (true);

-- Attachments
CREATE TABLE public.attachments (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT,
  filename TEXT,
  original_name TEXT,
  type TEXT NOT NULL DEFAULT 'link',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments readable by anyone" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "attachments insertable by anyone" ON public.attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "attachments updatable by anyone" ON public.attachments FOR UPDATE USING (true);
CREATE POLICY "attachments deletable by anyone" ON public.attachments FOR DELETE USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attachments bucket public read"
ON storage.objects FOR SELECT USING (bucket_id = 'attachments');

CREATE POLICY "attachments bucket public insert"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "attachments bucket public delete"
ON storage.objects FOR DELETE USING (bucket_id = 'attachments');
