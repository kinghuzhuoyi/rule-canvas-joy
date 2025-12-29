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

// 处理内联 Markdown 语法
const renderInline = (text: string): string => {
  if (!text) return '';
  
  return text
    // 代码 `code`
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // 粗体 **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体 *text*
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // 删除线 ~~text~~
    .replace(/~~(.+?)~~/g, '<del class="line-through text-muted-foreground">$1</del>')
    // 链接 [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>');
};

// 解析表格
const parseTable = (lines: string[]): string => {
  if (lines.length < 2) return lines.map(l => `<p>${renderInline(l)}</p>`).join('');
  
  const parseRow = (line: string): string[] => {
    return line.split('|').map(cell => cell.trim()).filter((_, i, arr) => i > 0 && i < arr.length);
  };
  
  const headerCells = parseRow(lines[0]);
  const isValidSeparator = /^\|?[\s\-:|]+\|?$/.test(lines[1]);
  
  if (!isValidSeparator) {
    return lines.map(l => `<p>${renderInline(l)}</p>`).join('');
  }
  
  let html = '<table class="w-full border-collapse text-sm my-2">';
  html += '<thead><tr>';
  headerCells.forEach(cell => {
    html += `<th class="border border-border bg-muted px-2 py-1 text-left font-medium">${renderInline(cell)}</th>`;
  });
  html += '</tr></thead>';
  
  html += '<tbody>';
  for (let i = 2; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    if (cells.length === 0) continue;
    html += '<tr>';
    cells.forEach(cell => {
      html += `<td class="border border-border px-2 py-1">${renderInline(cell)}</td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table>';
  
  return html;
};

// 完整的 Markdown 渲染函数
const renderMarkdown = (text: string): string => {
  if (!text) return '';
  
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // 多行代码块 ```
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      result.push(`<pre class="bg-muted rounded-md p-3 my-2 overflow-x-auto"><code class="text-xs font-mono">${codeLines.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
      i++;
      continue;
    }
    
    // 表格检测
    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s\-:|]+\|?$/.test(lines[i + 1])) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      result.push(parseTable(tableLines));
      continue;
    }
    
    // 标题 H1-H6
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2]);
      const styles: Record<number, string> = {
        1: 'text-xl font-bold mt-4 mb-2',
        2: 'text-lg font-semibold mt-3 mb-2',
        3: 'text-base font-semibold mt-3 mb-1',
        4: 'text-sm font-semibold mt-2 mb-1',
        5: 'text-sm font-medium mt-2 mb-1',
        6: 'text-xs font-medium mt-2 mb-1 text-muted-foreground',
      };
      result.push(`<h${level} class="${styles[level]}">${content}</h${level}>`);
      i++;
      continue;
    }
    
    // 分隔线 ---
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      result.push('<hr class="my-3 border-border" />');
      i++;
      continue;
    }
    
    // 引用块 >
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      result.push(`<blockquote class="border-l-4 border-muted-foreground/30 pl-3 my-2 italic text-muted-foreground">${quoteLines.map(l => renderInline(l)).join('<br />')}</blockquote>`);
      continue;
    }
    
    // 无序列表 - 或 *
    if (/^[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      result.push(`<ul class="list-disc list-inside ml-2 my-2 space-y-1">${listItems.map(item => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
      continue;
    }
    
    // 有序列表 1.
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      result.push(`<ol class="list-decimal list-inside ml-2 my-2 space-y-1">${listItems.map(item => `<li>${renderInline(item)}</li>`).join('')}</ol>`);
      continue;
    }
    
    // 空行
    if (line.trim() === '') {
      result.push('<br />');
      i++;
      continue;
    }
    
    // 普通段落
    result.push(`<p>${renderInline(line)}</p>`);
    i++;
  }
  
  return result.join('');
};

// 将文本转为单行（用于预览显示）
const toSingleLine = (text: string): string => {
  if (!text) return '';
  return text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
};

// 简化的单行渲染（用于预览）
const renderInlinePreview = (text: string): string => {
  if (!text) return '';
  // 移除块级语法标记，只保留内容
  return toSingleLine(text)
    .replace(/^#{1,6}\s+/g, '')
    .replace(/^>\s+/g, '')
    .replace(/^[-*]\s+/g, '')
    .replace(/^\d+\.\s+/g, '')
    .replace(/\|/g, ' ')
    .replace(/```[\s\S]*?```/g, '[代码块]')
    .replace(/---/g, '')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del class="line-through">$1</del>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>');
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
                  className="text-foreground truncate block"
                  dangerouslySetInnerHTML={{ __html: renderInlinePreview(value) }}
                />
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
          </TooltipTrigger>
          {value && value.length > 40 && (
            <TooltipContent side="bottom" className="max-w-lg p-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
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
          placeholder="支持完整 Markdown 语法..."
          className="min-h-[120px] text-sm resize-none font-mono"
          rows={6}
        />
        <p className="text-xs text-muted-foreground mt-1">
          # 标题 | **粗体** | *斜体* | ~~删除线~~ | `代码` | - 列表 | 1. 序号 | &gt; 引用 | [链接](url) | | 表格 |
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
                className="flex-1 text-foreground truncate"
                dangerouslySetInnerHTML={{ __html: renderInlinePreview(value) }}
              />
            ) : (
              <span className="flex-1 text-muted-foreground">{placeholder}</span>
            )}
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </TooltipTrigger>
        {value && value.length > 40 && (
          <TooltipContent side="bottom" className="max-w-lg p-4">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
