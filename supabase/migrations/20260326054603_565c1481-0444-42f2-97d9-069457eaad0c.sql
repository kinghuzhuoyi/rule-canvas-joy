
-- 决策表主表
CREATE TABLE public.decision_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 测试用例表
CREATE TABLE public.decision_table_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES public.decision_tables(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API Keys 表
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_decision_table_test_cases_table_id ON public.decision_table_test_cases(table_id);
CREATE INDEX idx_api_keys_key ON public.api_keys(key);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decision_tables_updated_at
  BEFORE UPDATE ON public.decision_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.decision_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_table_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 允许 service_role 完全访问（edge function 使用 service_role）
CREATE POLICY "Service role full access on decision_tables"
  ON public.decision_tables FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on test_cases"
  ON public.decision_table_test_cases FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on api_keys"
  ON public.api_keys FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 匿名用户只读决策表（用于前端展示）
CREATE POLICY "Anon read decision_tables"
  ON public.decision_tables FOR SELECT
  TO anon USING (true);

CREATE POLICY "Anon read test_cases"
  ON public.decision_table_test_cases FOR SELECT
  TO anon USING (true);

-- 插入默认 API Key
INSERT INTO public.api_keys (key, name) VALUES ('dk_' || encode(gen_random_bytes(24), 'hex'), 'Default API Key');
