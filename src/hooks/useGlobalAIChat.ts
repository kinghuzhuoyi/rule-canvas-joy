import { useState, useCallback } from 'react';
import { DecisionTableState } from '@/contexts/DecisionTableContext';
import { 
  ChatMessage, 
  AIGeneratedTable, 
  generateDecisionTable, 
  generateMessageId, 
  formatColumnConfirmation 
} from '@/services/aiService';
import { DataType, Column, Rule } from '@/components/decision-table/types';

// 表操作类型
interface TableOperation {
  type: 'create' | 'switch' | 'update' | 'delete';
  data?: {
    table?: AIGeneratedTable;
    tableId?: string;
    tableCode?: string;
    updates?: Partial<DecisionTableState>;
  };
}

interface UseGlobalAIChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, context: string, activeTable?: DecisionTableState | null) => Promise<void>;
  sendColumnConfirmation: (
    inputs: Array<{ name: string; label: string; dataType: DataType }>,
    outputs: Array<{ name: string; label: string; dataType: DataType }>,
    context: string
  ) => Promise<void>;
  sendTestCaseRequest: (columns: Column[], rules: Rule[], notes: string | undefined, context: string) => Promise<void>;
  clearMessages: () => void;
  lastGeneratedTable: AIGeneratedTable | null;
  lastTableOperation: TableOperation | null;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是全局决策表助手 🤖\n\n我可以帮你管理多个决策表：\n- **创建新表**："创建一个信用评分决策表"\n- **修改当前表**："添加一个年龄输入列"\n- **切换表**："切换到 DT_001"\n- **生成测试用例**：点击下方按钮\n\n请告诉我你想做什么？',
  timestamp: new Date(),
};

export function useGlobalAIChat(): UseGlobalAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedTable, setLastGeneratedTable] = useState<AIGeneratedTable | null>(null);
  const [lastTableOperation, setLastTableOperation] = useState<TableOperation | null>(null);

  const sendMessage = useCallback(async (
    content: string, 
    context: string,
    activeTable?: DecisionTableState | null
  ) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setLastTableOperation(null);

    // 构建带上下文的消息
    const enrichedContent = buildEnrichedMessage(content, context, activeTable);

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '正在分析您的需求...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      const history = messages.filter(m => m.id !== 'welcome' && !m.isLoading);
      const result = await generateDecisionTable(enrichedContent, history);

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        generatedTable: result.table || undefined,
        pendingConfirmation: result.pendingConfirmation,
        generatedTestCases: result.generatedTestCases,
        testCaseSummary: result.testCaseSummary,
        requiresConfirmation: result.requiresConfirmation,
      };

      setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), assistantMessage]);

      if (result.table) {
        setLastGeneratedTable(result.table);
        // 检测是否是创建新表的操作
        if (content.includes('创建') || content.includes('新建') || content.includes('生成')) {
          setLastTableOperation({
            type: 'create',
            data: { table: result.table },
          });
        }
      }

      // 处理确认消息
      if (content.trim() === '确认' || content.trim() === '确定' || content.trim() === 'OK') {
        setMessages(prev => prev.map(m => 
          m.requiresConfirmation ? { ...m, isConfirmed: true } : m
        ));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成失败，请重试';
      setError(errorMessage);

      const errorResponse: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `抱歉，${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setLastGeneratedTable(null);
    setLastTableOperation(null);
    setError(null);
  }, []);

  const sendColumnConfirmation = useCallback(async (
    inputs: Array<{ name: string; label: string; dataType: DataType }>,
    outputs: Array<{ name: string; label: string; dataType: DataType }>,
    context: string
  ) => {
    const confirmMessage = formatColumnConfirmation(inputs, outputs);
    await sendMessage(confirmMessage, context);
  }, [sendMessage]);

  const sendTestCaseRequest = useCallback(async (
    columns: Column[],
    rules: Rule[],
    notes: string | undefined,
    context: string
  ) => {
    if (isLoading) return;

    const inputCols = columns.filter(c => c.isInput);
    const outputCols = columns.filter(c => !c.isInput);

    let tableDescription = '请根据当前决策表生成测试用例：\n\n';
    
    tableDescription += '### 输入列\n';
    inputCols.forEach(col => {
      tableDescription += `- ${col.name} (${col.dataType})\n`;
    });
    
    tableDescription += '\n### 输出列\n';
    outputCols.forEach(col => {
      tableDescription += `- ${col.name} (${col.dataType})\n`;
    });
    
    tableDescription += '\n### 规则\n';
    tableDescription += '| ' + columns.map(c => c.name).join(' | ') + ' |\n';
    tableDescription += '|' + columns.map(() => '---').join('|') + '|\n';
    
    rules.forEach(rule => {
      const cells = columns.map(col => rule.cells[col.id] || '-');
      tableDescription += '| ' + cells.join(' | ') + ' |\n';
    });

    if (notes) {
      tableDescription += '\n### 需求备注\n' + notes.slice(0, 500);
    }

    tableDescription += '\n\n请生成覆盖常规条件、边界值、缺失值和无效值的测试用例。';

    await sendMessage(tableDescription, context);
  }, [sendMessage, isLoading]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendColumnConfirmation,
    sendTestCaseRequest,
    clearMessages,
    lastGeneratedTable,
    lastTableOperation,
  };
}

// 构建带上下文的消息
function buildEnrichedMessage(
  userMessage: string, 
  context: string,
  activeTable?: DecisionTableState | null
): string {
  let enriched = '';
  
  // 添加工作区上下文
  if (context) {
    enriched += `[工作区上下文]\n${context}\n\n`;
  }
  
  // 添加当前表的详细信息
  if (activeTable) {
    enriched += `[当前编辑的决策表]\n`;
    enriched += `- 编码：${activeTable.meta.code}\n`;
    enriched += `- 名称：${activeTable.meta.name}\n`;
    enriched += `- 输入列：${activeTable.columns.filter(c => c.isInput).map(c => c.name).join(', ') || '无'}\n`;
    enriched += `- 输出列：${activeTable.columns.filter(c => !c.isInput).map(c => c.name).join(', ') || '无'}\n`;
    enriched += `- 规则数：${activeTable.rules.length}\n\n`;
  }
  
  enriched += `[用户指令]\n${userMessage}`;
  
  return enriched;
}
