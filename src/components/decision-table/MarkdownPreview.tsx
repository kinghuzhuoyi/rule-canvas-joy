import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Edit3 } from 'lucide-react';

interface MarkdownPreviewProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
  className?: string;
}

// 简单的 Markdown 渲染函数
const renderMarkdown = (text: string): string => {
  if (!text) return '';
  
  return text
    // 代码块 `code`
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // 粗体 **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 斜体 *text*
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // 链接 [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank">$1</a>')
    // 换行
    .replace(/\n/g, '<br />');
};

// 截断文本
const truncateText = (text: string, maxLength: number = 60): string => {
  if (!text) return '';
  // 移除换行符用于单行显示
  const singleLine = text.replace(/\n/g, ' ');
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength) + '...';
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  value,
  onChange,
  placeholder = '点击输入描述...',
  readonly = false,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部时关闭编辑模式
  useEffect(() => {
    if (!isEditing) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  // 自动聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
  }, [isEditing, value.length]);

  if (readonly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "min-h-[38px] px-3 py-2 text-sm rounded-md border border-border bg-muted/50 cursor-default",
                "flex items-center",
                className
              )}
            >
              {value ? (
                <span
                  className="text-foreground line-clamp-1"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(truncateText(value)) }}
                />
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
          </TooltipTrigger>
          {value && value.length > 60 && (
            <TooltipContent side="bottom" className="max-w-md">
              <div
                className="prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
              />
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isEditing) {
    return (
      <div ref={containerRef} className={className}>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="支持 Markdown 语法：**粗体** *斜体* `代码` [链接](url)"
          className="min-h-[100px] text-sm resize-none"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          支持 Markdown：**粗体** *斜体* `代码` [链接](url)
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={() => setIsEditing(true)}
            className={cn(
              "min-h-[38px] px-3 py-2 text-sm rounded-md border border-input bg-background cursor-text",
              "flex items-center gap-2 group hover:border-primary/50 transition-colors",
              className
            )}
          >
            {value ? (
              <span
                className="flex-1 text-foreground line-clamp-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(truncateText(value)) }}
              />
            ) : (
              <span className="flex-1 text-muted-foreground">{placeholder}</span>
            )}
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </TooltipTrigger>
        {value && value.length > 60 && (
          <TooltipContent side="bottom" className="max-w-md">
            <div
              className="prose prose-sm dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
