import React, { useState, useRef, useEffect } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { AIGeneratedTable } from '@/services/aiService';
import { ChatMessage } from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIChatProps {
  onApplyTable: (table: AIGeneratedTable, userMessage?: string) => void;
  onUserMessage?: (message: string) => void;
  className?: string;
}

export const AIChat: React.FC<AIChatProps> = ({
  onApplyTable,
  onUserMessage,
  className,
}) => {
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat();
  const [input, setInput] = useState('');
  const [appliedTableCode, setAppliedTableCode] = useState<string | undefined>();
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
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

  // 应用表格
  const handleApplyTable = (table: AIGeneratedTable) => {
    onApplyTable(table, lastUserMessage);
    setAppliedTableCode(table.meta.code);
  };

  // 示例提示
  const examples = [
    '创建一个信用评分决策表',
    '贷款审批规则，根据信用分判断额度',
    'VIP客户折扣策略',
  ];

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
              onApplyTable={handleApplyTable}
              appliedTableId={appliedTableCode}
            />
          ))}
        </div>
      </ScrollArea>

      {/* 快捷示例 */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {examples.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setInput(example)}
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
};
