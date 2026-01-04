import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { AIGeneratedTable } from '@/services/aiService';
import { ChatMessage } from './ChatMessage';
import { ConfirmedColumn } from './ColumnConfirmationCard';
import { GeneratedTestCase } from './TestCasePreviewCard';
import { ApplyConfirmDialog } from './ApplyConfirmDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Trash2, Sparkles, FlaskConical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Column, Rule, TestCase, generateId } from './types';
import { toast } from 'sonner';

interface AIChatProps {
  onApplyTable: (table: AIGeneratedTable, userMessage?: string, requirementDoc?: string) => void;
  onUserMessage?: (message: string) => void;
  onImportTestCases?: (cases: TestCase[]) => void;
  hasExistingData?: boolean;
  columns?: Column[];
  rules?: Rule[];
  notes?: string;
  className?: string;
}

// 查找最近的需求文档（确认阶段 AI 输出的完整文档）
const findLatestRequirementDoc = (messages: Array<{ role: string; content: string; generatedTable?: AIGeneratedTable; isLoading?: boolean }>): string | undefined => {
  // 从后往前找，找到最近一条包含需求文档格式的 assistant 消息
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant' && !msg.generatedTable && !msg.isLoading) {
      // 检查是否是需求文档格式
      if (msg.content.includes('请确认以上需求是否正确') || 
          msg.content.includes('## 需求解析') ||
          msg.content.includes('### 判断规则')) {
        return msg.content;
      }
    }
  }
  return undefined;
};

export const AIChat: React.FC<AIChatProps> = ({
  onApplyTable,
  onUserMessage,
  onImportTestCases,
  hasExistingData = false,
  columns = [],
  rules = [],
  notes = '',
  className,
}) => {
  const { messages, isLoading, sendMessage, sendColumnConfirmation, sendTestCaseRequest, clearMessages } = useAIChat();
  const [input, setInput] = useState('');
  const [appliedTableCode, setAppliedTableCode] = useState<string | undefined>();
  const [importedTestCaseMessageId, setImportedTestCaseMessageId] = useState<string | undefined>();
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [pendingTable, setPendingTable] = useState<AIGeneratedTable | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput('');
    setLastUserMessage(message);
    onUserMessage?.(message);
    await sendMessage(message);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 请求应用表格（显示确认对话框）
  const handleRequestApply = (table: AIGeneratedTable) => {
    setPendingTable(table);
    setShowConfirmDialog(true);
  };

  // 确认应用表格
  const handleConfirmApply = () => {
    if (pendingTable) {
      // 查找最近的需求文档
      const requirementDoc = findLatestRequirementDoc(messages);
      onApplyTable(pendingTable, lastUserMessage, requirementDoc);
      setAppliedTableCode(pendingTable.meta.code);
    }
    setShowConfirmDialog(false);
    setPendingTable(null);
  };

  // 取消应用
  const handleCancelApply = () => {
    setShowConfirmDialog(false);
    setPendingTable(null);
  };

  // 处理列确认
  const handleColumnConfirm = useCallback((inputs: ConfirmedColumn[], outputs: ConfirmedColumn[]) => {
    sendColumnConfirmation(inputs, outputs);
  }, [sendColumnConfirmation]);

  // 处理需求确认
  const handleRequirementConfirm = useCallback(() => {
    sendMessage('确认');
  }, [sendMessage]);

  // 处理请求修改
  const handleRequestChange = useCallback(() => {
    textareaRef.current?.focus();
    setInput('我需要修改：');
  }, []);

  // 处理测试用例导入
  const handleImportTestCases = useCallback((cases: GeneratedTestCase[], messageId: string) => {
    if (!onImportTestCases) return;

    // 将 AI 生成的测试用例转换为 TestCase 格式
    const testCases: TestCase[] = cases.map((tc, index) => {
      // 将列名映射到列 ID
      const inputValues: Record<string, string> = {};
      const expectedOutputs: Record<string, string> = {};

      columns.forEach(col => {
        if (col.isInput && tc.inputs?.[col.name] !== undefined) {
          inputValues[col.id] = String(tc.inputs[col.name]);
        }
        if (!col.isInput && tc.expectedOutputs?.[col.name] !== undefined) {
          expectedOutputs[col.id] = String(tc.expectedOutputs[col.name]);
        }
      });

      return {
        id: generateId(),
        name: tc.name || `用例 ${index + 1}`,
        inputs: inputValues,
        expectedOutputs,
        status: 'pending' as const,
      };
    });

    onImportTestCases(testCases);
    setImportedTestCaseMessageId(messageId);
    toast.success(`已导入 ${testCases.length} 个测试用例到测试面板`);
  }, [columns, onImportTestCases]);

  // 功能按钮配置
  const actionButtons = [
    { 
      label: '测试用例生成', 
      action: 'generate-tests', 
      icon: FlaskConical,
      disabled: columns.length === 0 || rules.length === 0,
    },
    { 
      label: '异常定位', 
      action: 'diagnose', 
      icon: AlertCircle,
      disabled: true, // 暂未实现
    },
  ];

  // 处理功能按钮点击
  const handleActionClick = async (action: string) => {
    if (action === 'generate-tests') {
      if (columns.length === 0 || rules.length === 0) {
        toast.error('请先创建决策表后再生成测试用例');
        return;
      }
      await sendTestCaseRequest(columns, rules, notes);
    } else if (action === 'diagnose') {
      toast.info('异常定位功能即将推出');
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">AI 助手</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          className="h-7 px-2 text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 消息列表 */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="py-4 space-y-1">
          {messages.map(message => (
            <ChatMessage
              key={message.id}
              message={message}
              onApplyTable={handleRequestApply}
              onColumnConfirm={handleColumnConfirm}
              onImportTestCases={(cases) => handleImportTestCases(cases, message.id)}
              onRequirementConfirm={handleRequirementConfirm}
              onRequestChange={handleRequestChange}
              appliedTableId={appliedTableCode}
              importedTestCaseMessageId={importedTestCaseMessageId}
              isLoading={isLoading}
            />
          ))}
        </div>
      </ScrollArea>

      {/* 功能按钮区 */}
      <div className="px-4 pb-2">
        <div className="flex flex-wrap gap-2">
          {actionButtons.map((btn) => (
            <Button
              key={btn.action}
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1.5"
              onClick={() => handleActionClick(btn.action)}
              disabled={btn.disabled || isLoading}
            >
              <btn.icon className="w-3.5 h-3.5" />
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述您想创建的决策表..."
            className="min-h-[44px] max-h-32 resize-none text-sm"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-11 px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>

      {/* 确认对话框 */}
      <ApplyConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        table={pendingTable}
        hasExistingData={hasExistingData}
        onConfirm={handleConfirmApply}
        onCancel={handleCancelApply}
      />
    </div>
  );
};
