import { useState, useCallback } from 'react';
import { ChatMessage, AIGeneratedTable, AIGeneratedTestCase, generateDecisionTable, generateMessageId, formatColumnConfirmation } from '@/services/aiService';
import { DataType, Column, Rule } from '@/components/decision-table/types';

interface UseAIChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sendColumnConfirmation: (
    inputs: Array<{ name: string; label: string; dataType: DataType }>,
    outputs: Array<{ name: string; label: string; dataType: DataType }>
  ) => Promise<void>;
  sendTestCaseRequest: (columns: Column[], rules: Rule[], notes?: string) => Promise<void>;
  clearMessages: () => void;
  lastGeneratedTable: AIGeneratedTable | null;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是决策表助手 🤖\n\n请描述你想创建的决策表，例如：\n- "创建一个信用评分决策表，输入客户年龄和收入，输出信用等级和额度"\n- "帮我做一个贷款审批规则，根据信用分和年收入决定贷款额度和利率"',
  timestamp: new Date(),
};

export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedTable, setLastGeneratedTable] = useState<AIGeneratedTable | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // 添加加载状态的助手消息
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
      // 获取历史消息（不包括欢迎消息和加载消息）
      const history = messages.filter(m => m.id !== 'welcome' && !m.isLoading);
      
      const result = await generateDecisionTable(content, history);

      // 移除加载消息，添加真实响应
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        generatedTable: result.table || undefined,
        pendingConfirmation: result.pendingConfirmation,
        generatedTestCases: result.generatedTestCases,
        testCaseSummary: result.testCaseSummary,
      };

      setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), assistantMessage]);

      if (result.table) {
        setLastGeneratedTable(result.table);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成失败，请重试';
      setError(errorMessage);

      // 移除加载消息，添加错误响应
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
    setError(null);
  }, []);

  // 发送列确认信息
  const sendColumnConfirmation = useCallback(async (
    inputs: Array<{ name: string; label: string; dataType: DataType }>,
    outputs: Array<{ name: string; label: string; dataType: DataType }>
  ) => {
    const confirmMessage = formatColumnConfirmation(inputs, outputs);
    await sendMessage(confirmMessage);
  }, [sendMessage]);

  // 发送测试用例生成请求
  const sendTestCaseRequest = useCallback(async (
    columns: Column[],
    rules: Rule[],
    notes?: string
  ) => {
    if (isLoading) return;

    const inputCols = columns.filter(c => c.isInput);
    const outputCols = columns.filter(c => !c.isInput);

    // 构建决策表结构描述
    let tableDescription = '请根据以下决策表生成测试用例：\n\n';
    
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

    await sendMessage(tableDescription);
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
  };
}
