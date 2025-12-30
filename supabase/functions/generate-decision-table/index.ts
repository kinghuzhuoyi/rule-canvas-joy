import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `你是一个决策表设计专家。用户会描述他们的业务规则需求，你需要使用 create_decision_table 工具来生成决策表。

从用户描述中：
1. 提取决策表的编码（code，格式如 DT_XXX）和名称（name）
2. 识别输入条件列（isInput: true）和输出结果列（isInput: false）
3. 根据业务逻辑生成完整的规则行

数据类型说明：
- string：字符串，用于分类判断，输入时支持逗号分隔的多值匹配
- integer：整数，输入时支持区间表达式如 (0,100]
- decimal：小数，输入时支持区间表达式
- boolean：布尔值，true/false

区间表达式格式（仅用于 integer/decimal 类型的输入列）：
- (a,b) 开区间，不包含端点
- [a,b] 闭区间，包含端点
- (a,b] 或 [a,b) 半开半闭区间
- 支持 -inf 和 +inf 表示无穷
- 例如：(0,1000] 表示大于0且小于等于1000

生成规则时：
- 确保规则覆盖所有可能的输入情况
- 规则应该按照优先级从高到低排序
- 使用合理的边界值划分
- 输出值应该符合对应的数据类型

请根据用户描述，使用 create_decision_table 工具生成完整的决策表结构。`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_decision_table",
      description: "根据用户描述创建完整的决策表结构，包括元信息、列定义和规则",
      parameters: {
        type: "object",
        properties: {
          meta: {
            type: "object",
            description: "决策表元信息",
            properties: {
              code: { type: "string", description: "决策表唯一编码，格式如 DT_LOAN_APPROVAL" },
              name: { type: "string", description: "决策表显示名称" },
              description: { type: "string", description: "决策表描述说明，使用Markdown格式" }
            },
            required: ["code", "name", "description"]
          },
          columns: {
            type: "array",
            description: "列定义数组，包含输入列和输出列",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "列名称（英文，如 credit_score）" },
                label: { type: "string", description: "列显示标签（中文）" },
                dataType: { type: "string", enum: ["string", "integer", "decimal", "boolean"], description: "数据类型" },
                isInput: { type: "boolean", description: "是否为输入列（true）还是输出列（false）" }
              },
              required: ["name", "label", "dataType", "isInput"]
            }
          },
          rules: {
            type: "array",
            description: "规则行数组，每行是一个对象，key为列名，value为单元格值",
            items: {
              type: "object",
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
        return new Response(JSON.stringify({ error: "AI 服务额度不足，请联系管理员" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI 服务暂时不可用" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data).slice(0, 1000));

    // 解析 tool call 响应
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall && toolCall.function?.name === "create_decision_table") {
      const generatedTable = JSON.parse(toolCall.function.arguments);
      console.log("Generated table:", JSON.stringify(generatedTable).slice(0, 500));
      
      return new Response(JSON.stringify({ 
        success: true,
        table: generatedTable,
        message: `已生成决策表：${generatedTable.meta?.name || '未命名'}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 如果没有 tool call，返回文本响应
    const textContent = data.choices?.[0]?.message?.content || "无法生成决策表，请提供更详细的描述";
    
    return new Response(JSON.stringify({ 
      success: false,
      message: textContent 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-decision-table:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "生成决策表时发生错误" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
