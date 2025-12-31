import React from 'react';
import { ChatMessage as ChatMessageType } from '@/services/aiService';
import { AIGeneratedTable } from '@/services/aiService';
import { GeneratedTablePreview } from './GeneratedTablePreview';
import { ColumnConfirmationCard, ConfirmedColumn } from './ColumnConfirmationCard';
import { cn } from '@/lib/utils';
import { Bot, User, Loader2 } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  onApplyTable: (table: AIGeneratedTable) => void;
  onColumnConfirm?: (inputs: ConfirmedColumn[], outputs: ConfirmedColumn[]) => void;
  appliedTableId?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onApplyTable,
  onColumnConfirm,
  appliedTableId,
}) => {
  const isUser = message.role === 'user';
  const isApplied = message.generatedTable && appliedTableId === message.generatedTable.meta.code;

  return (
    <div className={cn(
      "flex gap-3 py-3",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* 头像 */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-muted-foreground"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* 消息内容 */}
      <div className={cn(
        "flex-1 min-w-0",
        isUser ? "text-right" : "text-left"
      )}>
        <div className={cn(
          "inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-foreground"
        )}>
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{message.content}</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>

        {/* 待确认列信息卡片 */}
        {message.pendingConfirmation && !message.isLoading && onColumnConfirm && (
          <div className={cn(
            "mt-2",
            isUser ? "ml-auto" : "mr-auto",
            "max-w-full"
          )}>
            <ColumnConfirmationCard
              pendingInputs={message.pendingConfirmation.inputs}
              pendingOutputs={message.pendingConfirmation.outputs}
              onConfirm={onColumnConfirm}
            />
          </div>
        )}

        {/* 生成的表格预览 */}
        {message.generatedTable && !message.isLoading && (
          <div className={cn(
            "mt-2",
            isUser ? "ml-auto" : "mr-auto",
            "max-w-full"
          )}>
            <GeneratedTablePreview
              table={message.generatedTable}
              onApply={onApplyTable}
              isApplied={isApplied}
            />
          </div>
        )}

        {/* 时间戳 */}
        <div className={cn(
          "text-xs text-muted-foreground mt-1",
          isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
