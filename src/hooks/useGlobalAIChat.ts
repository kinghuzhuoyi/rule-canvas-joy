import { useState, useCallback, useRef } from 'react';
import { DecisionTableState } from '@/contexts/DecisionTableContext';
import { 
  ChatMessage, 
  AIGeneratedTable, 
  ExecutionPlan,
  PlanStep,
  StepExecutionResult,
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
    context: string,
    activeTable?: DecisionTableState | null
  ) => Promise<void>;
  sendTestCaseRequest: (columns: Column[], rules: Rule[], notes: string | undefined, context: string) => Promise<void>;
  clearMessages: () => void;
  lastGeneratedTable: AIGeneratedTable | null;
  lastTableOperation: TableOperation | null;
  // Plan+ReAct 相关
  currentPlan: ExecutionPlan | null;
  confirmPlan: (context: string, activeTable?: DecisionTableState | null) => Promise<void>;
  modifyPlan: () => void;
  pauseExecution: () => void;
  resumeExecution: (context: string, activeTable?: DecisionTableState | null) => Promise<void>;
  skipStep: (context: string, activeTable?: DecisionTableState | null) => Promise<void>;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '你好！我是全局决策表助手 🤖\n\n我可以帮你管理多个决策表：\n- **创建新表**："创建一个信用评分决策表"\n- **修改当前表**："添加一个年龄输入列"\n- **切换表**："切换到 DT_001"\n- **生成测试用例**：点击下方按钮\n\n对于复杂任务，我会先制定执行计划供您确认后再逐步执行。',
  timestamp: new Date(),
};

export function useGlobalAIChat(): UseGlobalAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedTable, setLastGeneratedTable] = useState<AIGeneratedTable | null>(null);
  const [lastTableOperation, setLastTableOperation] = useState<TableOperation | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null);
  
  // 使用 ref 来避免 stale closure 问题
  const currentPlanRef = useRef<ExecutionPlan | null>(null);
  currentPlanRef.current = currentPlan;

  // 更新计划中某个步骤的状态
  const updatePlanStep = useCallback((
    stepIndex: number, 
    updates: Partial<PlanStep>
  ) => {
    setCurrentPlan(prev => {
      if (!prev) return null;
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates };
      return { ...prev, steps: newSteps };
    });
  }, []);

  // 执行下一步
  const executeNextStep = useCallback(async (
    context: string,
    activeTable?: DecisionTableState | null
  ) => {
    const plan = currentPlanRef.current;
    if (!plan || plan.status === 'completed') return;

    const stepIndex = plan.currentStepIndex;
    const step = plan.steps[stepIndex];
    
    if (!step) {
      setCurrentPlan(prev => prev ? { ...prev, status: 'completed' } : null);
      return;
    }

    // 标记当前步骤为运行中
    updatePlanStep(stepIndex, { status: 'running' });
    setCurrentPlan(prev => prev ? { ...prev, status: 'executing' } : null);

    // 构建步骤执行消息
    const stepMessage = `[执行步骤 ${stepIndex + 1}/${plan.steps.length}: ${step.title}]\n${step.description}`;
    
    const loadingMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: `正在执行步骤 ${stepIndex + 1}：${step.title}...`,
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, loadingMessage]);
    setIsLoading(true);

    try {
      const enrichedContent = buildEnrichedMessage(stepMessage, context, activeTable);
      const history = messages.filter(m => m.id !== 'welcome' && !m.isLoading);
      
      // 传递完整的计划上下文，让 AI 知道正在执行哪一步
      const result = await generateDecisionTable(
        enrichedContent, 
        history,
        { 
          planId: plan.id, 
          stepIndex,
          stepTitle: step.title,
          isExecutingPlan: true,
        }
      );

      // 处理步骤执行结果
      if (result.stepExecution) {
        const { thought, action, observation, status } = result.stepExecution;
        
        updatePlanStep(stepIndex, {
          status: status === 'completed' ? 'completed' : 
                  status === 'need_input' ? 'need_input' : 'failed',
          thought,
          action,
          observation,
        });

        const assistantMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
          stepExecution: result.stepExecution,
          generatedTable: result.table || undefined,
          pendingConfirmation: result.pendingConfirmation,
          generatedTestCases: result.generatedTestCases,
          testCaseSummary: result.testCaseSummary,
        };

        setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), assistantMessage]);

        if (result.table) {
          setLastGeneratedTable(result.table);
          setLastTableOperation({ type: 'create', data: { table: result.table } });
        }

        // 如果步骤完成，移动到下一步
        if (status === 'completed') {
          const nextIndex = stepIndex + 1;
          if (nextIndex >= plan.steps.length) {
            setCurrentPlan(prev => prev ? { ...prev, status: 'completed', currentStepIndex: nextIndex } : null);
          } else {
            setCurrentPlan(prev => prev ? { ...prev, currentStepIndex: nextIndex } : null);
            // 自动执行下一步（如果不需要用户输入）
            // 这里暂时不自动执行，让用户点击继续
          }
        } else if (status === 'need_input') {
          // 等待用户输入
          setCurrentPlan(prev => prev ? { ...prev, status: 'paused' } : null);
        }
      } else {
        // 没有 stepExecution，检查是否有 pendingConfirmation（需要用户输入）
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
          setLastTableOperation({ type: 'create', data: { table: result.table } });
        }

        // 如果有 pendingConfirmation，暂停等待用户输入
        if (result.pendingConfirmation) {
          updatePlanStep(stepIndex, { status: 'need_input' });
          setCurrentPlan(prev => prev ? { ...prev, status: 'paused' } : null);
        } else {
          // 标记步骤完成并移动到下一步
          updatePlanStep(stepIndex, { status: 'completed' });
          const nextIndex = stepIndex + 1;
          if (nextIndex >= plan.steps.length) {
            setCurrentPlan(prev => prev ? { ...prev, status: 'completed', currentStepIndex: nextIndex } : null);
          } else {
            setCurrentPlan(prev => prev ? { ...prev, currentStepIndex: nextIndex } : null);
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '执行失败';
      setError(errorMessage);

      updatePlanStep(stepIndex, { status: 'failed' });
      setCurrentPlan(prev => prev ? { ...prev, status: 'paused' } : null);

      const errorResponse: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `步骤 ${stepIndex + 1} 执行失败：${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, updatePlanStep]);

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

      // 检查是否返回了执行计划
      if (result.executionPlan) {
        setCurrentPlan(result.executionPlan);
        
        const planMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
          executionPlan: result.executionPlan,
          isPlanConfirmation: true,
        };

        setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), planMessage]);
      } else {
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
    setCurrentPlan(null);
    setError(null);
  }, []);

  // 列确认后继续执行计划的内部方法
  const continueAfterConfirmation = useCallback(async (
    confirmMessage: string,
    context: string,
    activeTable?: DecisionTableState | null
  ) => {
    const plan = currentPlanRef.current;
    if (!plan || plan.status !== 'paused') {
      return;
    }

    setError(null);

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: confirmMessage,
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: '正在处理确认信息...',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      const enrichedContent = buildEnrichedMessage(confirmMessage, context, activeTable);
      const history = messages.filter(m => m.id !== 'welcome' && !m.isLoading);
      
      // 传递计划上下文
      const stepIndex = plan.currentStepIndex;
      const step = plan.steps[stepIndex];
      
      const result = await generateDecisionTable(
        enrichedContent, 
        history,
        { 
          planId: plan.id, 
          stepIndex,
          stepTitle: step?.title || '',
          isExecutingPlan: true,
        }
      );

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
        generatedTable: result.table || undefined,
        pendingConfirmation: result.pendingConfirmation,
        generatedTestCases: result.generatedTestCases,
        testCaseSummary: result.testCaseSummary,
        stepExecution: result.stepExecution,
      };

      setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), assistantMessage]);

      if (result.table) {
        setLastGeneratedTable(result.table);
        setLastTableOperation({ type: 'create', data: { table: result.table } });
      }

      // 检查是否可以继续到下一步
      const status = result.stepExecution?.status;
      if (status === 'completed' || (!result.pendingConfirmation && !result.stepExecution)) {
        updatePlanStep(stepIndex, { status: 'completed' });
        const nextIndex = stepIndex + 1;
        if (nextIndex >= plan.steps.length) {
          setCurrentPlan(prev => prev ? { ...prev, status: 'completed', currentStepIndex: nextIndex } : null);
        } else {
          setCurrentPlan(prev => prev ? { ...prev, currentStepIndex: nextIndex, status: 'executing' } : null);
          // 短暂延迟后自动执行下一步
          setTimeout(() => {
            executeNextStep(context, activeTable);
          }, 500);
        }
      } else if (result.pendingConfirmation) {
        // 仍然需要用户输入
        setCurrentPlan(prev => prev ? { ...prev, status: 'paused' } : null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '处理失败';
      setError(errorMessage);

      const errorResponse: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `处理确认信息失败：${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev.filter(m => m.id !== loadingMessage.id), errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, updatePlanStep, executeNextStep]);

  const sendColumnConfirmation = useCallback(async (
    inputs: Array<{ name: string; label: string; dataType: DataType }>,
    outputs: Array<{ name: string; label: string; dataType: DataType }>,
    context: string,
    activeTable?: DecisionTableState | null
  ) => {
    const confirmMessage = formatColumnConfirmation(inputs, outputs);
    
    // 如果正在执行计划，使用计划继续流程
    const plan = currentPlanRef.current;
    if (plan && (plan.status === 'paused' || plan.status === 'executing')) {
      await continueAfterConfirmation(confirmMessage, context, activeTable);
    } else {
      await sendMessage(confirmMessage, context);
    }
  }, [sendMessage, continueAfterConfirmation]);

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

  // 确认计划并开始执行
  const confirmPlan = useCallback(async (
    context: string,
    activeTable?: DecisionTableState | null
  ) => {
    const plan = currentPlanRef.current;
    if (!plan) return;

    setCurrentPlan(prev => prev ? { ...prev, status: 'executing' } : null);
    
    // 添加确认消息
    const confirmMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: '确认执行计划',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMessage]);

    // 开始执行第一步
    await executeNextStep(context, activeTable);
  }, [executeNextStep]);

  // 修改计划
  const modifyPlan = useCallback(() => {
    setCurrentPlan(null);
    // 聚焦输入框让用户修改
  }, []);

  // 暂停执行
  const pauseExecution = useCallback(() => {
    setCurrentPlan(prev => prev ? { ...prev, status: 'paused' } : null);
  }, []);

  // 继续执行
  const resumeExecution = useCallback(async (
    context: string,
    activeTable?: DecisionTableState | null
  ) => {
    const plan = currentPlanRef.current;
    if (!plan) return;
    await executeNextStep(context, activeTable);
  }, [executeNextStep]);

  // 跳过当前步骤
  const skipStep = useCallback(async (
    context: string,
    activeTable?: DecisionTableState | null
  ) => {
    const plan = currentPlanRef.current;
    if (!plan) return;

    const stepIndex = plan.currentStepIndex;
    updatePlanStep(stepIndex, { status: 'skipped' });

    const nextIndex = stepIndex + 1;
    if (nextIndex >= plan.steps.length) {
      setCurrentPlan(prev => prev ? { ...prev, status: 'completed', currentStepIndex: nextIndex } : null);
    } else {
      setCurrentPlan(prev => prev ? { ...prev, currentStepIndex: nextIndex } : null);
      // 执行下一步
      await executeNextStep(context, activeTable);
    }
  }, [updatePlanStep, executeNextStep]);

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
    currentPlan,
    confirmPlan,
    modifyPlan,
    pauseExecution,
    resumeExecution,
    skipStep,
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
