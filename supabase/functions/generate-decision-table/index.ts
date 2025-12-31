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
- 数字：支持区间表达式，如 "(0,100]" 表示大于0且小于等于100，"[0,+inf)" 表示大于等于0，"(596,+inf)" 表示大于596
- 布尔值："true" 或 "false"
- "-" 表示任意值（通配符）

输出列的值格式：
- 直接填写具体的输出值

【极其重要 - 必须遵守】生成 rules 时，每个规则对象必须完整包含所有列的 key-value 对：
- key 是列的 name 字段值（如 "credit_score"）
- value 是该单元格的值（如 "(700,+inf)" 或 "500000"）

===== 示例1：贷款审批（4列）=====
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

===== 示例2：VIP折扣（4列）=====
columns: [
  {"name": "level", "label": "会员等级", "dataType": "string", "isInput": true},
  {"name": "amount", "label": "消费金额", "dataType": "decimal", "isInput": true},
  {"name": "discount", "label": "折扣", "dataType": "decimal", "isInput": false},
  {"name": "points", "label": "积分", "dataType": "integer", "isInput": false}
]
rules: [
  {"level": "白金", "amount": "(10000,+inf)", "discount": "0.85", "points": "500"},
  {"level": "白金", "amount": "(5000,10000]", "discount": "0.88", "points": "300"},
  {"level": "黄金", "amount": "(5000,+inf)", "discount": "0.90", "points": "200"},
  {"level": "黄金", "amount": "[0,5000]", "discount": "0.95", "points": "100"},
  {"level": "-", "amount": "-", "discount": "1.00", "points": "50"}
]

===== 示例3：解析 Markdown 表格格式 =====
用户可能会提供 Markdown 表格格式的规则，如：
| product_id | score     | rate   |
|------------|-----------|--------|
| sZ0101     | (596,+inf)| 0.0150 |
| sZ0101     | (566,596] | 0.0388 |
| sZ0101     | (541,566] | 0.0444 |

你需要：
1. 根据表头识别列名（第一行）
2. 根据用户说明判断哪些是输入列、哪些是输出列
3. 将表格每行数据转为规则对象

解析后的 columns:
[
  {"name": "product_id", "label": "产品ID", "dataType": "string", "isInput": true},
  {"name": "score", "label": "分数", "dataType": "integer", "isInput": true},
  {"name": "rate", "label": "费率", "dataType": "decimal", "isInput": false}
]

解析后的 rules（必须完整包含每一列）:
[
  {"product_id": "sZ0101", "score": "(596,+inf)", "rate": "0.0150"},
  {"product_id": "sZ0101", "score": "(566,596]", "rate": "0.0388"},
  {"product_id": "sZ0101", "score": "(541,566]", "rate": "0.0444"}
]

===== Markdown 表格解析规则 =====
1. 表头行（第一行）定义列名
2. 分隔行（第二行，含 --- 或 |---|）忽略
3. 数据行从第三行开始，每行对应一条规则
4. 保持单元格值原样（包括区间表达式如 "(596,+inf)"、小数如 "0.0150"）
5. 去除值两侧的空格
6. 如果用户说明了"输入"和"输出"，据此设置 isInput

【禁止】不要生成空对象 {}，不要生成缺少 key 的对象！每个规则对象必须包含全部列的 name 作为 key！`;

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
            minItems: 1,
            description: `规则行数组。【重要】每个规则对象的 key 必须是列的 name，value 是该单元格的值。

正确示例：
[
  {"credit_score": "(700,+inf)", "income": "(100000,+inf)", "loan_limit": "500000", "interest_rate": "0.05"},
  {"credit_score": "(600,700]", "income": "(50000,100000]", "loan_limit": "200000", "interest_rate": "0.08"}
]

错误示例（禁止）：
[{}, {}, {}]  // 空对象是错误的！每个对象必须包含所有列的 key-value`,
            items: {
              type: "object",
              minProperties: 1,
              description: "单行规则。key 是列名 (如 credit_score)，value 是单元格值 (如 '(700,+inf)')",
              additionalProperties: { 
                type: "string",
                minLength: 1
              }
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
      
      return new Response(JSON.stringify({
        success: false,
        message: `已识别决策表结构「${generatedTable.meta.name}」，但规则内容需要更详细的描述。\n\n请补充具体的规则条件，例如：\n- 当信用分 > 700 且收入 > 10万时，额度 50万，利率 5%\n- 当信用分 600-700 时，额度 20万，利率 8%`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
