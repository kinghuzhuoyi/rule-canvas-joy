-- Allow anon to delete decision_tables and test_cases (for frontend delete sync)
CREATE POLICY "Anon delete decision_tables" ON public.decision_tables FOR DELETE TO anon USING (true);
CREATE POLICY "Anon delete test_cases" ON public.decision_table_test_cases FOR DELETE TO anon USING (true);
-- Also allow anon insert/update for decision_tables and test_cases
CREATE POLICY "Anon insert decision_tables" ON public.decision_tables FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update decision_tables" ON public.decision_tables FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon insert test_cases" ON public.decision_table_test_cases FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update test_cases" ON public.decision_table_test_cases FOR UPDATE TO anon USING (true) WITH CHECK (true);