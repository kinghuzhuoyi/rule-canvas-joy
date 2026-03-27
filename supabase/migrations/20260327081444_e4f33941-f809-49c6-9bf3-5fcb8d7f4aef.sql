
CREATE POLICY "Anon insert variables" ON public.variables FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update variables" ON public.variables FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete variables" ON public.variables FOR DELETE TO anon USING (true);
