import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDecisionTableContext } from '@/contexts/DecisionTableContext';
import { useGlobalAIChat } from '@/hooks/useGlobalAIChat';
import { AIGeneratedTable } from '@/services/aiService';
import { ChatMessage } from './ChatMessage';
import { ConfirmedColumn } from './ColumnConfirmationCard';
import { GeneratedTestCase } from './TestCasePreviewCard';
import { ApplyConfirmDialog } from './ApplyConfirmDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Trash2, Sparkles, FlaskConical, AlertCircle, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TestCase, generateId } from './types';
import { toast } from 'sonner';

interface GlobalAIChatProps {
  className?: string;
}

export const GlobalAIChat: React.FC<GlobalAIChatProps> = ({ className }) => {
  const { 
    tables, 
    activeTable, 
    activeTableId, 
    createTable, 
    updateTable, 
    setActiveTable,
    getTableSummary 
  } = useDecisionTableContext();
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    sendColumnConfirmation, 
    sendTestCaseRequest, 
    clearMessages,
    lastTableOperation,
  } = useGlobalAIChat();
  
  const [input, setInput] = useState('');
  const [appliedTableCode, setAppliedTableCode] = useState<string | undefined>();
  const [importedTestCaseMessageId, setImportedTestCaseMessageId] = useState<string | undefined>();
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [pendingTable, setPendingTable] = useState<AIGeneratedTable | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 处理 AI 返回的表操作
  useEffect(() => {
    if (!lastTableOperation) return;
    
    const { type, data } = lastTableOperation;
    
    switch (type) {
      case 'create':
        if (data?.table) {
          createTable({
            meta: data.table.meta,
            columns: data.table.columns,
            rules: data.table.rules,
          });
          toast.success(`已创建决策表：${data.table.meta.name}`);
        }
        break;
      case 'switch':
        if (data?.tableId) {
          setActiveTable(data.tableId);
          toast.success(`已切换到决策表`);
        } else if (data?.tableCode) {
          const targetTable = tables.find(t => t.meta.code === data.tableCode);
          if (targetTable) {
            setActiveTable(targetTable.id);
            toast.success(`已切换到：${targetTable.meta.name}`);
          }
        }
        break;
      case 'update':
        if (activeTableId && data?.updates) {
          updateTable(activeTableId, data.updates);
          toast.success('已更新决策表');
        }
        break;
    }
  }, [lastTableOperation, createTable, setActiveTable, updateTable, activeTableId, tables]);

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
    
    // 获取上下文信息
    const context = getTableSummary();
    await sendMessage(message, context, activeTable);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 请求应用表格
  const handleRequestApply = (table: AIGeneratedTable) => {
    setPendingTable(table);
    setShowConfirmDialog(true);
  };

  // 确认应用表格
  const handleConfirmApply = () => {
    if (pendingTable && activeTableId) {
      updateTable(activeTableId, {
        meta: pendingTable.meta,
        columns: pendingTable.columns,
        rules: pendingTable.rules,
      });
      setAppliedTableCode(pendingTable.meta.code);
      toast.success(`已应用决策表：${pendingTable.meta.name}`);
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
    const context = getTableSummary();
    sendColumnConfirmation(inputs, outputs, context);
  }, [sendColumnConfirmation, getTableSummary]);

  // 处理需求确认
  const handleRequirementConfirm = useCallback(() => {
    const context = getTableSummary();
    sendMessage('确认', context, activeTable);
  }, [sendMessage, getTableSummary, activeTable]);

  // 处理请求修改
  const handleRequestChange = useCallback(() => {
    textareaRef.current?.focus();
    setInput('我需要修改：');
  }, []);

  // 处理测试用例导入
  const handleImportTestCases = useCallback((cases: GeneratedTestCase[], messageId: string) => {
    if (!activeTable) {
      toast.error('请先选择一个决策表');
      return;
    }

    const testCases: TestCase[] = cases.map((tc, index) => {
      const inputValues: Record<string, string> = {};
      const expectedOutputs: Record<string, string> = {};

      activeTable.columns.forEach(col => {
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

    updateTable(activeTable.id, { 
      testCases: [...activeTable.testCases, ...testCases] 
    });
    setImportedTestCaseMessageId(messageId);
    toast.success(`已导入 ${testCases.length} 个测试用例`);
  }, [activeTable, updateTable]);

  // 功能按钮配置
  const actionButtons = [
    { 
      label: '测试用例生成', 
      action: 'generate-tests', 
      icon: FlaskConical,
      disabled: !activeTable || activeTable.columns.length === 0 || activeTable.rules.length === 0,
    },
    { 
      label: '列出所有表', 
      action: 'list-tables', 
      icon: List,
      disabled: false,
    },
    { 
      label: '异常定位', 
      action: 'diagnose', 
      icon: AlertCircle,
      disabled: true,
    },
  ];

  // 处理功能按钮点击
  const handleActionClick = async (action: string) => {
    if (action === 'generate-tests') {
      if (!activeTable || activeTable.columns.length === 0 || activeTable.rules.length === 0) {
        toast.error('请先创建决策表后再生成测试用例');
        return;
      }
      const context = getTableSummary();
      await sendTestCaseRequest(activeTable.columns, activeTable.rules, activeTable.notes, context);
    } else if (action === 'list-tables') {
      const summary = getTableSummary();
      toast.info(summary);
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
          <span className="font-medium text-sm">全局 AI 助手</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {tables.length} 个表
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 当前表提示 */}
      {activeTable && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border">
          <p className="text-xs text-muted-foreground">
            当前编辑：<span className="text-foreground font-medium">{activeTable.meta.name}</span>
            <span className="ml-2 text-muted-foreground/70">({activeTable.meta.code})</span>
          </p>
        </div>
      )}

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
            placeholder="创建新表、修改当前表、或切换到其他表..."
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
          支持：创建新表、切换表、修改当前表、生成测试用例
        </p>
      </div>

      {/* 确认对话框 */}
      <ApplyConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        table={pendingTable}
        hasExistingData={activeTable ? (activeTable.columns.length > 0 || activeTable.rules.length > 0) : false}
        onConfirm={handleConfirmApply}
        onCancel={handleCancelApply}
      />
    </div>
  );
};
