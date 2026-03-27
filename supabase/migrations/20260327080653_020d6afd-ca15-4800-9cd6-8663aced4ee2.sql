
CREATE TABLE public.variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  data_type text NOT NULL DEFAULT 'string',
  description text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read variables" ON public.variables FOR SELECT TO anon USING (true);
CREATE POLICY "Service role full access on variables" ON public.variables FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_variables_updated_at BEFORE UPDATE ON public.variables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
