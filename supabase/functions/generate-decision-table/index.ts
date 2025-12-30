import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `你是一个决策表设计专家。根据用户的描述，帮助设计和创建决策表。

决策表用于定义业务规则，包含：
1. 元信息：编码(code)、名称(name)、描述(description)
2. 输入列：用于匹配条件的列
3. 输出列：匹配成功后返回的结果列
4. 规则行：每行定义一组条件和对应的输出

输入列的值格式：
- 字符串：直接填值，多个值用逗号分隔表示"或"关系，如 "白金,黄金"
- 数字：支持区间表达式，如 "(0,100]" 表示大于0且小于等于100，"[0,+inf)" 表示大于等于0
- 布尔值："true" 或 "false"
- "-" 表示任意值（通配符）

输出列的值格式：
- 直接填写具体的输出值

【重要】生成规则时的格式要求：
rules 数组中的每一行必须是一个完整的对象，格式为：
{
  "输入列name": "条件值",
  "输出列name": "结果值"
}

完整示例 - 贷款审批决策表：
columns: [
  {"name": "credit_score", "label": "信用分", "dataType": "integer", "isInput": true},
  {"name": "income", "label": "年收入", "dataType": "decimal", "isInput": true},
  {"name": "loan_limit", "label": "贷款额度", "dataType": "decimal", "isInput": false},
  {"name": "interest_rate", "label": "利率", "dataType": "decimal", "isInput": false}
]
rules: [
  {"credit_score": "(700,+inf)", "income": "(100000,+inf)", "loan_limit": "500000", "interest_rate": "0.05"},
  {"credit_score": "(700,+inf)", "income": "(50000,100000]", "loan_limit": "300000", "interest_rate": "0.06"},
  {"credit_score": "(600,700]", "income": "(50000,+inf)", "loan_limit": "200000", "interest_rate": "0.08"},
  {"credit_score": "[0,600]", "income": "-", "loan_limit": "50000", "interest_rate": "0.12"}
]

【警告】不要生成空的规则对象 {}，每个规则必须包含所有列的 name 作为 key，以及对应的值！`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_decision_table",
      description: "创建一个决策表，包含元信息、列定义和规则",
      parameters: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            description: "决策表元信息",
            properties: {
              code: { type: "string", description: "决策表编码，如 DT_LOAN_APPROVAL" },
              name: { type: "string", description: "决策表名称，如 贷款审批决策表" },
              description: { type: "string", description: "决策表描述" }
            },
            required: ["code", "name", "description"]
          },
          columns: {
            type: "array",
            description: "列定义数组",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "列名（英文），如 credit_score" },
                label: { type: "string", description: "列显示标签（中文），如 信用分" },
                dataType: { 
                  type: "string", 
                  enum: ["string", "integer", "decimal", "boolean"],
                  description: "数据类型" 
                },
                isInput: { type: "boolean", description: "是否为输入列，true为输入列，false为输出列" }
              },
              required: ["name", "label", "dataType", "isInput"]
            }
          },
          rules: {
            type: "array",
            description: `规则行数组。每一行是一个对象，其中 key 是列的 name 字段，value 是该单元格的字符串值。

示例（假设有 credit_score, income, loan_limit, interest_rate 四列）：
[
  {"credit_score": "(700,+inf)", "income": "(100000,+inf)", "loan_limit": "500000", "interest_rate": "0.05"},
  {"credit_score": "(600,700]", "income": "(50000,100000]", "loan_limit": "200000", "interest_rate": "0.08"},
  {"credit_score": "[0,600]", "income": "-", "loan_limit": "50000", "interest_rate": "0.12"}
]

注意：每行必须包含所有列的 name 作为 key，不能返回空对象 {}！`,
            items: {
              type: "object",
              description: "单行规则，key为列的name，value为单元格值字符串",
              additionalProperties: { type: "string" }
            }
          }
        },
        required: ["meta", "columns", "rules"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating decision table with messages:", JSON.stringify(messages).slice(0, 500));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_decision_table" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 服务额度不足" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data).slice(0, 1000));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || toolCall.function.name !== "create_decision_table") {
      return new Response(JSON.stringify({
        success: false,
        message: data.choices?.[0]?.message?.content || "无法理解您的需求，请更详细地描述决策表的用途和规则。",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generatedTable = JSON.parse(toolCall.function.arguments);
    console.log("Generated table:", JSON.stringify(generatedTable).slice(0, 500));

    // 验证规则完整性
    const columnNames = generatedTable.columns.map((col: any) => col.name);
    const isRulesValid = generatedTable.rules.every((rule: any) => 
      Object.keys(rule).length > 0 && 
      columnNames.every((name: string) => rule[name] !== undefined)
    );

    if (!isRulesValid) {
      console.warn("AI generated incomplete rules, rules:", JSON.stringify(generatedTable.rules));
    }

    return new Response(JSON.stringify({
      success: true,
      table: generatedTable,
      message: `已生成决策表「${generatedTable.meta.name}」，包含 ${generatedTable.columns.length} 列和 ${generatedTable.rules.length} 条规则。`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-decision-table function:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "生成失败" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
