import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `你是一个决策表设计专家，采用 Plan + ReAct 框架处理复杂任务。

## 【最关键规则】复杂任务必须先创建计划

### 判断任务复杂度
- **简单任务**（直接执行，无需创建计划）：
  - 单一操作：如"添加一个年龄列"、"切换到 DT_001"、"删除第3条规则"
  - 明确的小修改：如"把利率改成0.05"
  
- **复杂任务**（【必须】首先调用 create_plan）：
  - 创建完整决策表：如"创建一个贷款审批决策表"
  - 多步骤任务：如"创建决策表并生成测试用例"
  - 需求分析任务：如"根据这个需求设计决策表"
  - 涉及确认流程的任务

### 【禁止】复杂任务直接输出需求文档
当用户请求创建决策表时：
- 【禁止】直接输出需求分析文档
- 【禁止】直接调用 request_column_confirmation
- 【必须】首先调用 create_plan 创建执行计划

### 阶段1: 规划（Planning）
对于复杂需求，【必须首先】使用 create_plan 工具生成执行计划：
1. 分析用户目标，拆解为 2-6 个可执行步骤
2. 每步明确目标和所需工具
3. 等待用户确认计划

### 阶段2: 执行（ReAct）
用户确认计划后，逐步执行。对于每个步骤：
1. **Thought**（思考）：分析当前步骤需要做什么
2. **Action**（行动）：调用相应工具执行操作
3. **Observation**（观察）：观察执行结果
4. 使用 report_step_result 报告每步结果

## 【最重要】工具调用规则（必须严格遵守）

### create_plan 工具使用规则
当检测到复杂任务时，【必须】调用 create_plan 工具：
- 创建新决策表
- 多步骤任务
- 需要用户确认的流程

### request_column_confirmation 工具使用规则
当检测到以下任一情况时，【必须立即】调用 request_column_confirmation 工具：
1. 用户提供了 Markdown 表格，但没有明确说明哪些是输入列、哪些是输出列
2. 识别到的列缺少编码（name）或类型（dataType）
3. 需要用户从变量列表中选择输入变量
4. 列信息不完整，需要用户补充

【严禁】使用纯文本询问列信息！必须调用 request_column_confirmation 工具！

### generate_test_cases 工具使用规则
当用户请求生成测试用例时，【必须】调用 generate_test_cases 工具。

### report_step_result 工具使用规则
在计划执行过程中，每完成一个步骤必须调用 report_step_result 报告结果。

## 交互规则

### 需求分析阶段
1. 根据用户描述，分析并整理决策表需求
2. 如果列信息不完整，【必须】调用 request_column_confirmation 工具
3. 列信息完整后，按照【决策表需求文档标准格式】输出需求文档
4. 【禁止】在用户确认前调用 create_decision_table 工具

### 生成决策表阶段
仅当用户回复包含以下确认词时，才调用 create_decision_table 工具：
- 确认、确定、可以、没问题、正确、对的、好的、OK、ok、生成、应用

### 测试用例生成阶段
当用户明确请求生成测试用例时，调用 generate_test_cases 工具。

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
| (700,+inf) | (100000,+inf)|500000| 0.05 |

---
✅ 请确认以上需求是否正确？如有修改请补充，确认无误请回复「确认」。

===========以下是关键要素定义================
# 决策表定义
决策表用于定义业务规则，包含：
1. 元信息：编码(code)、名称(name)、描述(description)
2. 输入列：用于匹配条件的列
3. 输出列：匹配成功后返回的结果列
4. 规则行：每行定义一组条件和对应的输出

输入列的值格式：
- 字符串：直接填值，多个值用逗号分隔表示"或"关系
- 数字：支持区间表达式，如 "(0,100]" 表示大于0且小于等于100
- 布尔值："true" 或 "false"
- "-" 表示任意值（通配符）

========【对象格式说明】========================
【极其重要】生成 rules 时，每个规则对象必须完整包含所有列的 key-value 对：
- key 是列的 name 字段值
- value 是该单元格的值

columns: [
  {"name": "credit_score", "label": "信用分", "dataType": "integer", "isInput": true}]
rules: [
  {"credit_score": "(700,+inf)", "income": "(100000,+inf)", "loan_limit": "500000", "interest_rate": "0.05"}]

【禁止】不要生成空对象 {}，不要生成缺少 key 的对象！`;

const tools = [
  // Plan+ReAct 工具：创建执行计划
  {
    type: "function",
    function: {
      name: "create_plan",
      description: "为复杂任务创建分步执行计划。当任务涉及多个步骤（如创建决策表、需求分析、测试用例生成）时必须调用此工具。",
      parameters: {
        type: "object",
        properties: {
          goal: { 
            type: "string", 
            description: "用户的最终目标，用一句话概括" 
          },
          steps: {
            type: "array",
            description: "执行步骤列表，2-6个步骤",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "步骤标题，如「需求分析」「列定义确认」" },
                description: { type: "string", description: "步骤描述，说明这一步要做什么" },
                toolToCall: { 
                  type: "string", 
                  enum: ["analyze_requirement", "request_column_confirmation", 
                         "design_rules", "create_decision_table", 
                         "generate_test_cases", "validate_rules"],
                  description: "此步骤要调用的工具" 
                }
              },
              required: ["title", "description", "toolToCall"]
            }
          }
        },
        required: ["goal", "steps"]
      }
    }
  },
  // Plan+ReAct 工具：报告步骤执行结果
  {
    type: "function",
    function: {
      name: "report_step_result",
      description: "报告当前步骤的执行过程和结果。在计划执行过程中，每完成一个步骤必须调用此工具。",
      parameters: {
        type: "object",
        properties: {
          stepIndex: { type: "integer", description: "步骤索引（从0开始）" },
          thought: { type: "string", description: "思考过程：分析这一步需要做什么" },
          action: { type: "string", description: "执行动作：实际做了什么" },
          observation: { type: "string", description: "观察结果：执行后得到了什么" },
          status: { 
            type: "string", 
            enum: ["completed", "failed", "need_input"],
            description: "执行状态：completed-完成，failed-失败，need_input-需要用户输入" 
          },
          result: { 
            type: "object", 
            description: "执行结果数据（如有）",
            additionalProperties: true
          }
        },
        required: ["stepIndex", "thought", "action", "observation", "status"]
      }
    }
  },
  // 原有工具：创建决策表
  {
    type: "function",
    function: {
      name: "create_decision_table",
      description: "【仅在用户确认需求后调用】创建一个决策表，包含元信息、列定义和规则。",
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
                isInput: { type: "boolean", description: "是否为输入列" },
              },
              required: ["name", "label", "dataType", "isInput"],
            },
          },
          rules: {
            type: "array",
            minItems: 1,
            description: "规则行数组，每个对象的 key 是列的 name，value 是单元格值",
            items: {
              type: "object",
              minProperties: 1,
              additionalProperties: { type: "string", minLength: 1 },
            },
          },
        },
        required: ["meta", "columns", "rules"],
      },
    },
  },
  // 原有工具：请求列确认
  {
    type: "function",
    function: {
      name: "request_column_confirmation",
      description: "【优先使用】当需要确认列信息时必须调用此工具，而非用文本询问。",
      parameters: {
        type: "object",
        properties: {
          message: { type: "string", description: "提示消息" },
          inputs: {
            type: "array",
            description: "待确认的输入列",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                name: { type: "string" },
                dataType: { type: "string", enum: ["string", "integer", "decimal", "boolean"] },
                needsSelection: { type: "boolean" }
              },
              required: ["label"]
            }
          },
          outputs: {
            type: "array",
            description: "待确认的输出列",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                name: { type: "string" },
                dataType: { type: "string", enum: ["string", "integer", "decimal", "boolean"] }
              },
              required: ["label"]
            }
          }
        },
        required: ["message"]
      },
    },
  },
  // 原有工具：生成测试用例
  {
    type: "function",
    function: {
      name: "generate_test_cases",
      description: "根据决策表的规则结构生成测试用例。",
      parameters: {
        type: "object",
        properties: {
          testCases: {
            type: "array",
            description: "生成的测试用例数组",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "测试用例名称" },
                description: { type: "string", description: "测试场景说明" },
                category: { 
                  type: "string", 
                  enum: ["normal", "boundary", "missing", "invalid"],
                  description: "测试类别" 
                },
                inputs: { 
                  type: "object", 
                  description: "输入值对象",
                  additionalProperties: { type: "string" }
                },
                expectedOutputs: { 
                  type: "object", 
                  description: "预期输出值对象",
                  additionalProperties: { type: "string" }
                }
              },
              required: ["name", "category", "inputs"]
            }
          },
          summary: { type: "string", description: "测试用例生成摘要" }
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
    const { messages, planContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating decision table with messages:", JSON.stringify(messages).slice(0, 500));
    if (planContext) {
      console.log("Plan context:", JSON.stringify(planContext));
    }

    // 根据计划上下文动态调整系统提示词
    let dynamicSystemPrompt = systemPrompt;
    if (planContext?.isExecutingPlan) {
      dynamicSystemPrompt += `

## 【当前执行状态】
你正在执行计划中的步骤 ${planContext.stepIndex + 1}: ${planContext.stepTitle}

【重要指令】
1. 完成当前步骤的任务
2. 如果需要用户输入（如确认列信息），调用相应工具并设置 status 为 "need_input"
3. 如果步骤完成，调用 report_step_result 并设置 status 为 "completed"
4. 【禁止】在计划执行中再次调用 create_plan`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: dynamicSystemPrompt }, ...messages],
        tools,
        tool_choice: "auto",
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

    // 如果没有工具调用，返回消息内容
    if (!toolCall) {
      const content = data.choices?.[0]?.message?.content || "请描述您想创建的决策表需求。";
      
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
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    // 处理 create_plan 工具调用
    if (functionName === "create_plan") {
      console.log("Plan created:", JSON.stringify(functionArgs).slice(0, 500));
      
      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: `已为您制定执行计划：${functionArgs.goal}\n\n共 ${functionArgs.steps.length} 个步骤，请确认后开始执行。`,
          executionPlan: {
            goal: functionArgs.goal,
            steps: functionArgs.steps,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 处理 report_step_result 工具调用
    if (functionName === "report_step_result") {
      console.log("Step result:", JSON.stringify(functionArgs).slice(0, 500));
      
      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: functionArgs.observation,
          stepExecution: {
            stepIndex: functionArgs.stepIndex,
            thought: functionArgs.thought,
            action: functionArgs.action,
            observation: functionArgs.observation,
            status: functionArgs.status,
            result: functionArgs.result,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 处理列确认请求工具调用
    if (functionName === "request_column_confirmation") {
      console.log("Column confirmation requested:", JSON.stringify(functionArgs).slice(0, 500));
      
      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: functionArgs.message || "请确认以下列信息：",
          pendingConfirmation: {
            inputs: functionArgs.inputs || [],
            outputs: functionArgs.outputs || [],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 处理测试用例生成工具调用
    if (functionName === "generate_test_cases") {
      console.log("Test cases generated:", JSON.stringify(functionArgs).slice(0, 1000));
      
      return new Response(
        JSON.stringify({
          success: true,
          table: null,
          message: functionArgs.summary || `已生成 ${functionArgs.testCases?.length || 0} 个测试用例`,
          generatedTestCases: functionArgs.testCases || [],
          testCaseSummary: functionArgs.summary,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 处理 create_decision_table 工具调用
    if (functionName === "create_decision_table") {
      console.log("Generated table:", JSON.stringify(functionArgs).slice(0, 500));

      // 验证规则完整性
      const columnNames = functionArgs.columns.map((col: any) => col.name);
      const isRulesValid = functionArgs.rules.every(
        (rule: any) => Object.keys(rule).length > 0 && columnNames.every((name: string) => rule[name] !== undefined),
      );

      if (!isRulesValid) {
        console.warn("AI generated incomplete rules:", JSON.stringify(functionArgs.rules));

        return new Response(
          JSON.stringify({
            success: true,
            table: null,
            message: `已识别决策表结构「${functionArgs.meta.name}」，但规则数据不完整。\n\n请确认规则内容是否正确，或补充具体的规则条件。`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          table: functionArgs,
          message: `✅ 已生成决策表「${functionArgs.meta.name}」，包含 ${functionArgs.columns.length} 列和 ${functionArgs.rules.length} 条规则。`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 其他工具调用，返回消息内容
    const content = data.choices?.[0]?.message?.content || "请描述您想创建的决策表需求。";
    return new Response(
      JSON.stringify({
        success: true,
        table: null,
        message: content,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
