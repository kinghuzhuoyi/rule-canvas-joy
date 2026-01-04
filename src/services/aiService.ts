import { DecisionTableMeta, Column, Rule, generateId, DataType } from '@/components/decision-table/types';

// AI 生成的决策表结构
export interface AIGeneratedTable {
  meta: DecisionTableMeta;
  columns: Column[];
  rules: Rule[];
}

// 待确认列信息
export interface PendingColumn {
  name?: string;
  label?: string;
  dataType?: DataType;
  needsSelection?: boolean;
}

// 待确认信息
export interface PendingConfirmation {
  inputs?: PendingColumn[];
  outputs?: PendingColumn[];
}

// AI 生成的测试用例
export interface AIGeneratedTestCase {
  name: string;
  description?: string;
  category: 'normal' | 'boundary' | 'missing' | 'invalid';
  inputs: Record<string, string>;
  expectedOutputs?: Record<string, string>;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  generatedTable?: AIGeneratedTable;
  pendingConfirmation?: PendingConfirmation;
  generatedTestCases?: AIGeneratedTestCase[];
  testCaseSummary?: string;
  timestamp: Date;
  isLoading?: boolean;
  requiresConfirmation?: boolean;  // 是否需要用户确认（需求文档阶段）
  isConfirmed?: boolean;           // 用户是否已确认
}

// AI 响应结构
interface AIResponse {
  success: boolean;
  table?: {
    meta: {
      code: string;
      name: string;
      description: string;
    };
    columns: Array<{
      name: string;
      label: string;
      dataType: 'string' | 'integer' | 'decimal' | 'boolean';
      isInput: boolean;
    }>;
    rules: Array<Record<string, string>>;
  };
  pendingConfirmation?: PendingConfirmation;
  generatedTestCases?: AIGeneratedTestCase[];
  testCaseSummary?: string;
  message?: string;
  error?: string;
  requiresConfirmation?: boolean;
}

// 将 AI 响应转换为应用数据结构
function transformAIResponse(response: AIResponse): AIGeneratedTable | null {
  if (!response.success || !response.table) {
    return null;
  }

  const { meta, columns: aiColumns, rules: aiRules } = response.table;

  // 为每个列生成唯一 ID
  const columns: Column[] = aiColumns.map((col, index) => ({
    id: generateId(),
    name: col.name,
    dataType: col.dataType,
    isInput: col.isInput,
    variableId: col.isInput ? `var_${index + 1}` : undefined,
  }));

  // 创建列名到 ID 的映射
  const columnNameToId: Record<string, string> = {};
  aiColumns.forEach((col, index) => {
    columnNameToId[col.name] = columns[index].id;
  });

  // 转换规则
  const rules: Rule[] = aiRules.map(() => {
    const ruleId = generateId();
    return { id: ruleId, cells: {} };
  });

  // 填充规则单元格
  aiRules.forEach((aiRule, ruleIndex) => {
    Object.entries(aiRule).forEach(([colName, value]) => {
      const colId = columnNameToId[colName];
      if (colId) {
        rules[ruleIndex].cells[colId] = value;
      }
    });
  });

  return {
    meta: {
      code: meta.code,
      name: meta.name,
      description: meta.description,
    },
    columns,
    rules,
  };
}

// 调用 Edge Function 生成决策表
export async function generateDecisionTable(
  userMessage: string,
  conversationHistory: ChatMessage[]
): Promise<{ 
  table: AIGeneratedTable | null; 
  message: string; 
  pendingConfirmation?: PendingConfirmation;
  generatedTestCases?: AIGeneratedTestCase[];
  testCaseSummary?: string;
  requiresConfirmation?: boolean;
}> {
  const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-decision-table`;

  // 构建消息历史
  const messages = [
    ...conversationHistory
      .filter(msg => !msg.isLoading)
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    { role: 'user' as const, content: userMessage },
  ];

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试');
      }
      if (response.status === 402) {
        throw new Error('AI 服务额度不足');
      }
      
      throw new Error(errorData.error || '生成决策表失败');
    }

    const data: AIResponse = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    const table = transformAIResponse(data);
    
    return {
      table,
      message: data.message || (table ? `已生成决策表：${table.meta.name}` : '无法解析生成结果'),
      pendingConfirmation: data.pendingConfirmation,
      generatedTestCases: data.generatedTestCases,
      testCaseSummary: data.testCaseSummary,
      requiresConfirmation: data.requiresConfirmation,
    };
  } catch (error) {
    console.error('AI service error:', error);
    throw error;
  }
}

// 生成唯一消息 ID
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 格式化列确认信息为用户消息
export function formatColumnConfirmation(
  inputs: Array<{ name: string; label: string; dataType: DataType }>,
  outputs: Array<{ name: string; label: string; dataType: DataType }>
): string {
  let message = '已确认列信息：\n\n';
  
  if (inputs.length > 0) {
    message += '**输入列：**\n';
    inputs.forEach(col => {
      message += `- ${col.label}（${col.name}，${col.dataType}）\n`;
    });
    message += '\n';
  }
  
  if (outputs.length > 0) {
    message += '**输出列：**\n';
    outputs.forEach(col => {
      message += `- ${col.label}（${col.name}，${col.dataType}）\n`;
    });
  }
  
  return message;
}
