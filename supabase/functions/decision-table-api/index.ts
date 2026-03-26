import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

/* ───── helpers ───── */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/* ───── auth ───── */

async function authenticate(req: Request): Promise<boolean> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return false;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("api_keys")
    .select("id")
    .eq("key", apiKey)
    .eq("is_active", true)
    .maybeSingle();
  return !!data;
}

/* ───── rule engine (duplicated from client for edge runtime) ───── */

interface Column {
  id: string;
  name: string;
  dataType: string;
  isInput: boolean;
  variableId?: string;
}

interface Rule {
  id: string;
  cells: Record<string, string>;
}

function parseRange(expr: string) {
  if (!expr || expr.trim() === "" || expr === "-" || expr === "*")
    return { type: "any" as const };
  const m = expr
    .trim()
    .match(
      /^([\[\(])(-?inf|-?\d+\.?\d*),\s*(-?inf|\+?inf|-?\d+\.?\d*)([\]\)])$/
    );
  if (m) {
    return {
      type: "range" as const,
      start: m[2] === "-inf" ? -Infinity : parseFloat(m[2]),
      end: m[3] === "+inf" || m[3] === "inf" ? Infinity : parseFloat(m[3]),
      si: m[1] === "[",
      ei: m[4] === "]",
    };
  }
  return { type: "single" as const, value: expr.trim() };
}

function matches(iv: string, cond: string, dt: string): boolean {
  if (!cond || cond.trim() === "" || cond === "-" || cond === "*") return true;
  if (!iv || iv.trim() === "") return false;
  const p = parseRange(cond);
  if (p.type === "any") return true;
  if (p.type === "range") {
    const n = parseFloat(iv);
    if (isNaN(n)) return false;
    const ok1 = p.si ? n >= p.start! : n > p.start!;
    const ok2 = p.ei ? n <= p.end! : n < p.end!;
    return ok1 && ok2;
  }
  if (dt === "boolean") return iv.toLowerCase() === String(p.value).toLowerCase();
  if (dt === "integer" || dt === "decimal") return parseFloat(iv) === parseFloat(String(p.value));
  return iv === p.value;
}

function executeRules(
  inputs: Record<string, string>,
  columns: Column[],
  rules: Rule[]
): { matched: boolean; matchedRuleId?: string; outputs: Record<string, string> } {
  const inCols = columns.filter((c) => c.isInput);
  const outCols = columns.filter((c) => !c.isInput);
  for (const rule of rules) {
    let ok = true;
    for (const col of inCols) {
      if (!matches(inputs[col.id] || inputs[col.name] || "", rule.cells[col.id] || "", col.dataType)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      const outputs: Record<string, string> = {};
      for (const col of outCols) {
        outputs[col.name] = rule.cells[col.id] || "";
      }
      return { matched: true, matchedRuleId: rule.id, outputs };
    }
  }
  return { matched: false, outputs: {} };
}

/* ───── route handling ───── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!(await authenticate(req))) return err("Invalid or missing API key", 401);

  const url = new URL(req.url);
  // Strip function name prefix, then "decision-tables" resource prefix
  const rawPath = url.pathname.replace(/^\/decision-table-api\/?/, "");
  const pathParts = rawPath.replace(/^decision-tables\/?/, "").split("/").filter(Boolean);
  const isDecisionTablesRoute = rawPath.startsWith("decision-tables") || rawPath === "" || rawPath === "/";
  const sb = supabaseAdmin();

  try {
    // POST /decision-tables
    if (req.method === "POST" && pathParts.length === 0) {
      const body = await req.json();
      const { code, name, description, notes, columns, rules } = body;
      if (!code || !name) return err("code and name are required");
      const { data, error: e } = await sb
        .from("decision_tables")
        .insert({ code, name, description: description || "", notes: notes || "", columns: columns || [], rules: rules || [] })
        .select()
        .single();
      if (e) return err(e.message, 500);
      return json(data, 201);
    }

    // GET /decision-tables
    if (req.method === "GET" && pathParts.length === 0) {
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = Math.min(parseInt(url.searchParams.get("page_size") || "20"), 100);
      const offset = (page - 1) * pageSize;
      const { data, error: e, count } = await sb
        .from("decision_tables")
        .select("id,code,name,description,created_at,updated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (e) return err(e.message, 500);
      return json({ data, total: count, page, page_size: pageSize });
    }

    // Single table routes: /decision-tables/{id}
    if (pathParts.length >= 1) {
      const tableId = pathParts[0];

      // GET /decision-tables/{id}
      if (req.method === "GET" && pathParts.length === 1) {
        const { data, error: e } = await sb.from("decision_tables").select("*").eq("id", tableId).maybeSingle();
        if (e) return err(e.message, 500);
        if (!data) return err("Decision table not found", 404);
        return json(data);
      }

      // PUT /decision-tables/{id}
      if (req.method === "PUT" && pathParts.length === 1) {
        const body = await req.json();
        const updates: Record<string, unknown> = {};
        for (const k of ["code", "name", "description", "notes", "columns", "rules"]) {
          if (body[k] !== undefined) updates[k] = body[k];
        }
        const { data, error: e } = await sb.from("decision_tables").update(updates).eq("id", tableId).select().single();
        if (e) return err(e.message, 500);
        return json(data);
      }

      // DELETE /decision-tables/{id}
      if (req.method === "DELETE" && pathParts.length === 1) {
        const { error: e } = await sb.from("decision_tables").delete().eq("id", tableId);
        if (e) return err(e.message, 500);
        return json({ success: true });
      }

      // POST /decision-tables/{id}/execute
      if (req.method === "POST" && pathParts[1] === "execute") {
        const { data: table } = await sb.from("decision_tables").select("columns,rules").eq("id", tableId).maybeSingle();
        if (!table) return err("Decision table not found", 404);
        const { inputs } = await req.json();
        if (!inputs) return err("inputs is required");
        // Map input by column name to column id
        const cols = table.columns as Column[];
        const mappedInputs: Record<string, string> = {};
        for (const col of cols.filter((c) => c.isInput)) {
          mappedInputs[col.id] = inputs[col.name] ?? inputs[col.id] ?? "";
        }
        const result = executeRules(mappedInputs, cols, table.rules as Rule[]);
        return json(result);
      }

      // Test cases
      if (pathParts[1] === "test-cases") {
        // GET /decision-tables/{id}/test-cases
        if (req.method === "GET" && pathParts.length === 2) {
          const { data, error: e } = await sb
            .from("decision_table_test_cases")
            .select("*")
            .eq("table_id", tableId)
            .order("created_at");
          if (e) return err(e.message, 500);
          return json(data);
        }

        // POST /decision-tables/{id}/test-cases
        if (req.method === "POST" && pathParts.length === 2) {
          const { cases } = await req.json();
          if (!Array.isArray(cases)) return err("cases array is required");
          const rows = cases.map((c: any) => ({
            table_id: tableId,
            name: c.name || "",
            inputs: c.inputs || {},
            expected_outputs: c.expectedOutputs || c.expected_outputs || {},
          }));
          const { data, error: e } = await sb.from("decision_table_test_cases").insert(rows).select();
          if (e) return err(e.message, 500);
          return json(data, 201);
        }

        // POST /decision-tables/{id}/test-cases/run
        if (req.method === "POST" && pathParts[2] === "run") {
          const { data: table } = await sb.from("decision_tables").select("columns,rules").eq("id", tableId).maybeSingle();
          if (!table) return err("Decision table not found", 404);
          const { data: testCases } = await sb
            .from("decision_table_test_cases")
            .select("*")
            .eq("table_id", tableId);
          if (!testCases || testCases.length === 0) return err("No test cases found", 404);

          const cols = table.columns as Column[];
          const outCols = cols.filter((c) => !c.isInput);
          const results = testCases.map((tc: any) => {
            // Map inputs by column name
            const mappedInputs: Record<string, string> = {};
            for (const col of cols.filter((c) => c.isInput)) {
              mappedInputs[col.id] = tc.inputs[col.name] ?? tc.inputs[col.id] ?? "";
            }
            const exec = executeRules(mappedInputs, cols, table.rules as Rule[]);
            // Compare outputs
            let passed = exec.matched;
            if (exec.matched && tc.expected_outputs) {
              for (const col of outCols) {
                const expected = tc.expected_outputs[col.name] ?? tc.expected_outputs[col.id] ?? "";
                if (expected && exec.outputs[col.name] !== expected) {
                  passed = false;
                  break;
                }
              }
            }
            return {
              id: tc.id,
              name: tc.name,
              status: !exec.matched ? "no-match" : passed ? "passed" : "failed",
              matchedRuleId: exec.matchedRuleId,
              actualOutputs: exec.outputs,
            };
          });

          const summary = {
            total: results.length,
            passed: results.filter((r: any) => r.status === "passed").length,
            failed: results.filter((r: any) => r.status === "failed").length,
            noMatch: results.filter((r: any) => r.status === "no-match").length,
          };

          return json({ summary, results });
        }
      }
    }

    return err("Not found", 404);
  } catch (e) {
    console.error("API error:", e);
    return err(e instanceof Error ? e.message : "Internal server error", 500);
  }
});
