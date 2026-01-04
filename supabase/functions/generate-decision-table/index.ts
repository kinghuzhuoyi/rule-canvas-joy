import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `你是一个决策表设计专家。根据用户的描述，帮助设计和创建决策表。

## 【最重要】工具调用规则（必须严格遵守）

### request_column_confirmation 工具使用规则
当检测到以下任一情况时，【必须立即】调用 request_column_confirmation 工具：
1. 用户提供了 Markdown 表格，但没有明确说明哪些是输入列、哪些是输出列
2. 识别到的列缺少编码（name）或类型（dataType）
3. 需要用户从变量列表中选择输入变量
4. 列信息不完整，需要用户补充

【严禁】使用纯文本询问列信息！必须调用 request_column_confirmation 工具！
【严禁】在文本中询问"哪些是输入列"、"数据类型是什么"等问题！

### request_column_confirmation 调用示例
当用户提供 Markdown 表格但未说明输入/输出时：
工具调用参数：
{
  "message": "已识别到表格中的列，请确认以下信息：",
  "inputs": [
    { "label": "产品ID", "needsSelection": true },
    { "label": "分数", "needsSelection": true }
  ],
  "outputs": [
    { "label": "利率" }
  ]
}

### generate_test_cases 工具使用规则
当用户请求生成测试用例时（如点击"测试用例生成"按钮），【必须】调用 generate_test_cases 工具。

测试用例生成策略：
1. **常规用例 (normal)**：每条规则生成至少一个典型输入用例，覆盖所有规则分支
2. **边界值用例 (boundary)**：
   - 区间表达式的边界点：如 (0,100] 生成 0（不含边界）、1（最小含边界）、100（最大含边界）、101（超出边界）
   - [500,+inf) 生成 499（不含）、500（含边界）
   - 字符串枚举测试第一个和最后一个值
3. **缺失值用例 (missing)**：关键输入为空/未提供的情况
4. **无效值用例 (invalid)**：不在任何规则范围内的输入组合

【重要】测试用例的 inputs 和 expectedOutputs 使用列的 name 作为 key。

## 交互规则

### 第一阶段：需求分析与确认
1. 根据用户描述，分析并整理决策表需求
2. 如果列信息不完整，【必须】调用 request_column_confirmation 工具
3. 列信息完整后，按照【决策表需求文档标准格式】输出需求文档
4. 【禁止】在用户确认前调用 create_decision_table 工具

### 第二阶段：生成决策表
仅当用户回复包含以下确认词时，才调用 create_decision_table 工具：
- 确认、确定、可以、没问题、正确、对的、好的、OK、ok、生成、应用

### 测试用例生成阶段
当用户明确请求生成测试用例时（消息包含"生成测试用例"或来自系统的测试用例请求），调用 generate_test_cases 工具。

### 多轮对话处理
- 如果用户有补充或修改，重新整理需求文档，不要调用工具
- 如果需求不完整（缺少列定义、规则等），【必须】调用 request_column_confirmation 工具
- 只有在需求完整且用户明确确认后，才调用 create_decision_table 工具

# 执行以下动作
1. 根据用户初始需求，进行初步需求整理
2. 分析输入定义是否完善（需要编码、类型、中文名），缺任一要素【必须】调用 request_column_confirmation 工具
3. 分析输出定义是否完善（需要编码、类型、中文名），缺任一要素【必须】调用 request_column_confirmation 工具
4. 列信息完整后，整理成需求文档请求确认
5. 用户确认后，调用 create_decision_table 工具生成决策表对象

===========以下是【决策表需求文档标准格式】================
# [决策表名称]
## 原始需求
> 用户的原始描述...

## 需求解析
### 基本信息
- **编码**: DT_LOAN_APPROVAL
- **名称**: 贷款审批决策表
- **描述**: 根据客户信用分和年收入决定贷款额度和利率

### 输入列
|列名 |类型 |说明 |
|------|------|------|
| credit_score | integer| 信用分 |
| income | decimal| 年收入 |

### 输出列
|列名 |类型 |说明 |
|------|------|------|
|limit |decimal | 贷款额度 |
| rate | decimal | 利率 |

### 判断规则
| credit_score | income     | limit  |rate   |
|------------|-----------|--------|-------|
| sZ0101     | (596,+inf)|1000| 0.0150 |

---
✅ 请确认以上需求是否正确？如有修改请补充，确认无误请回复「确认」。

===========以下是关键要素定义以及需求说明================
# 决策表定义
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

# Markdown 表格处理【重要】
用户可能会提供 Markdown 表格格式的规则，如：
| product_id | score     | rate   |
|------------|-----------|--------|
| sZ0101     | (596,+inf)| 0.0150 |

【必须】当用户提供 Markdown 表格时：
1. 如果用户未明确说明输入/输出列，【必须立即】调用 request_column_confirmation 工具
2. 如果用户已说明但缺少编码或类型，【必须】调用 request_column_confirmation 工具
3. 只有信息完整后，才整理成需求文档请求确认

===== Markdown 表格解析规则 =====
1. 表头行（第一行）定义列名
2. 分隔行（第二行，含 --- 或 |---|）忽略
3. 数据行从第三行开始，每行对应一条规则
4. 保持单元格值原样（包括区间表达式如 "(596,+inf)"、小数如 "0.0150"）
5. 去除值两侧的空格

========【对象格式说明】========================
【极其重要 - 必须遵守】生成 rules 时，每个规则对象必须完整包含所有列的 key-value 对：
- key 是列的 name 字段值（如 "credit_score"）
- value 是该单元格的值（如 "(700,+inf)" 或 "500000"）

# 对象格式定义：
## 输入输出说明：
columns: [
  {"name": "credit_score", "label": "信用分", "dataType": "integer", "isInput": true}]
## 规则条件说明：
rules: [
  {"credit_score": "(700,+inf)", "income": "(100000,+inf)", "loan_limit": "500000", "interest_rate": "0.05"}]


===== 示例1：贷款审批（4列）====
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



【禁止】不要生成空对象 {}，不要生成缺少 key 的对象！每个规则对象必须包含全部列的 name 作为 key！`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_decision_table",
      description: "【仅在用户确认需求后调用】创建一个决策表，包含元信息、列定义和规则。在调用此工具前，必须先向用户展示需求文档并获得用户明确确认（用户回复包含：确认、确定、可以、没问题、正确、对的、好的、OK、生成、应用等确认词）。",
      parameters: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            description: "决策表元信息",
            properties: {
              code: { type: "string", description: "决策表编码，如 DT_LOAN_APPROVAL" },
              name: { type: "string", description: "决策表名称，如 贷款审批决策表" },
              description: { type: "string", description: "决策表描述" },
            },
            required: ["code", "name", "description"],
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
                  description: "数据类型",
                },
                isInput: { type: "boolean", description: "是否为输入列，true为输入列，false为输出列" },
              },
              required: ["name", "label", "dataType", "isInput"],
            },
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
                minLength: 1,
              },
            },
          },
        },
        required: ["meta", "columns", "rules"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_column_confirmation",
      description: `【优先使用】当需要确认列信息时必须调用此工具，而非用文本询问。

适用场景：
- 用户提供 Markdown 表格但未说明输入/输出列
- 列定义缺少编码或类型
- 需要用户选择输入变量

【禁止】使用纯文本询问列信息，必须使用此工具！`,
      parameters: {
        type: "object",
        properties: {
          message: { 
            type: "string", 
            description: "提示消息，说明需要用户确认的内容" 
          },
          inputs: {
            type: "array",
            description: "待确认的输入列，用户需要从变量列表中选择",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "已识别的中文名称" },
                name: { type: "string", description: "已识别的编码（如有）" },
                dataType: { 
                  type: "string", 
                  enum: ["string", "integer", "decimal", "boolean"],
                  description: "已识别的类型（如有）" 
                },
                needsSelection: { 
                  type: "boolean", 
                  description: "是否需要用户从变量列表选择，通常为 true" 
                }
              },
              required: ["label"]
            }
          },
          outputs: {
            type: "array",
            description: "待确认的输出列，用户需要填写编码和类型",
            items: {
              type: "object",
              properties: {
                label: { type: "string", description: "已识别的中文名称" },
                name: { type: "string", description: "已识别的编码（如有）" },
                dataType: { 
                  type: "string", 
                  enum: ["string", "integer", "decimal", "boolean"],
                  description: "已识别的类型（如有）" 
                }
              },
              required: ["label"]
            }
          }
        },
        required: ["message"]
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_test_cases",
      description: `根据决策表的规则结构生成测试用例，覆盖常规条件、边界值、缺失值、无效值等多种场景。

当用户请求生成测试用例时调用此工具。输入和输出使用列的 name（编码）作为 key。`,
      parameters: {
        type: "object",
        properties: {
          testCases: {
            type: "array",
            description: "生成的测试用例数组",
            items: {
              type: "object",
              properties: {
                name: { 
                  type: "string", 
                  description: "测试用例名称，如 'TC01: 高信用高收入'" 
                },
                description: { 
                  type: "string", 
                  description: "测试场景说明" 
                },
                category: { 
                  type: "string", 
                  enum: ["normal", "boundary", "missing", "invalid"],
                  description: "测试类别：normal-常规用例，boundary-边界值，missing-缺失值，invalid-无效值" 
                },
                inputs: { 
                  type: "object", 
                  description: "输入值对象，key 是输入列的 name，value 是测试值",
                  additionalProperties: { type: "string" }
                },
                expectedOutputs: { 
                  type: "object", 
                  description: "预期输出值对象，key 是输出列的 name，value 是预期值（可选，无匹配时留空）",
                  additionalProperties: { type: "string" }
                }
              },
              required: ["name", "category", "inputs"]
            }
          },
          summary: { 
            type: "string", 
            description: "测试用例生成摘要，说明覆盖情况" 
          }
        },
        required: ["testCases", "summary"]
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        tool_choice: "auto",  // 让 AI 自主决定是否调用工具
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

    // 如果没有工具调用，说明 AI 在进行需求分析或等待确认
    if (!toolCall) {
      const content = data.choices?.[0]?.message?.content || "请描述您想创建的决策表需求。";
      
      // 检测是否是需求确认请求
      const requiresConfirmation = content.includes('请确认以上需求是否正确') || 
                                   content.includes('确认无误请回复') ||
                                   content.includes('请回复「确认」');
      
      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: content,
          requiresConfirmation,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 处理列确认请求工具调用
    if (toolCall.function.name === "request_column_confirmation") {
      const confirmationArgs = JSON.parse(toolCall.function.arguments);
      console.log("Column confirmation requested:", JSON.stringify(confirmationArgs).slice(0, 500));
      
      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: confirmationArgs.message || "请确认以下列信息：",
          pendingConfirmation: {
            inputs: confirmationArgs.inputs || [],
            outputs: confirmationArgs.outputs || [],
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 处理测试用例生成工具调用
    if (toolCall.function.name === "generate_test_cases") {
      const testCaseArgs = JSON.parse(toolCall.function.arguments);
      console.log("Test cases generated:", JSON.stringify(testCaseArgs).slice(0, 1000));
      
      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: testCaseArgs.summary || `已生成 ${testCaseArgs.testCases?.length || 0} 个测试用例`,
          generatedTestCases: testCaseArgs.testCases || [],
          testCaseSummary: testCaseArgs.summary,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 非 create_decision_table 工具调用，返回消息内容
    if (toolCall.function.name !== "create_decision_table") {
      const content = data.choices?.[0]?.message?.content || "请描述您想创建的决策表需求。";
      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: content,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 用户已确认，AI 调用了工具生成决策表
    const generatedTable = JSON.parse(toolCall.function.arguments);
    console.log("Generated table:", JSON.stringify(generatedTable).slice(0, 500));

    // 验证规则完整性
    const columnNames = generatedTable.columns.map((col: any) => col.name);
    const isRulesValid = generatedTable.rules.every(
      (rule: any) => Object.keys(rule).length > 0 && columnNames.every((name: string) => rule[name] !== undefined),
    );

    if (!isRulesValid) {
      console.warn("AI generated incomplete rules, rules:", JSON.stringify(generatedTable.rules));

      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: `已识别决策表结构「${generatedTable.meta.name}」，但规则数据不完整。\n\n请确认规则内容是否正确，或补充具体的规则条件。`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        table: generatedTable,
        message: `✅ 已生成决策表「${generatedTable.meta.name}」，包含 ${generatedTable.columns.length} 列和 ${generatedTable.rules.length} 条规则。`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-decision-table function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
