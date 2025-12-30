import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  readonly?: boolean;
}

// Markdown 渲染函数
function renderMarkdown(text: string): string {
  if (!text) return '';
  
  const lines = text.split('\n');
  let html = '';
  let inCodeBlock = false;
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';
  let inTable = false;
  let tableRows: string[] = [];

  const renderInline = (line: string): string => {
    return line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>');
  };

  const parseTable = (rows: string[]): string => {
    if (rows.length < 2) return rows.join('\n');
    
    const headerCells = rows[0].split('|').filter(c => c.trim());
    const bodyRows = rows.slice(2);
    
    let table = '<table class="w-full border-collapse text-sm my-2">';
    table += '<thead><tr>';
    headerCells.forEach(cell => {
      table += `<th class="border border-border px-2 py-1 bg-muted text-left font-medium">${renderInline(cell.trim())}</th>`;
    });
    table += '</tr></thead><tbody>';
    
    bodyRows.forEach(row => {
      const cells = row.split('|').filter(c => c.trim());
      table += '<tr>';
      cells.forEach(cell => {
        table += `<td class="border border-border px-2 py-1">${renderInline(cell.trim())}</td>`;
      });
      table += '</tr>';
    });
    
    table += '</tbody></table>';
    return table;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 代码块
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>';
        inCodeBlock = false;
      } else {
        html += '<pre class="bg-muted rounded p-3 my-2 overflow-x-auto"><code class="text-sm">';
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      html += line.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n';
      continue;
    }

    // 表格检测
    if (line.includes('|') && line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
      continue;
    } else if (inTable) {
      html += parseTable(tableRows);
      inTable = false;
      tableRows = [];
    }

    // 关闭列表
    if (inList && !line.match(/^(\d+\.|-|\*)\s/)) {
      html += listType === 'ul' ? '</ul>' : '</ol>';
      inList = false;
    }

    // 标题
    if (line.startsWith('# ')) {
      html += `<h1 class="text-xl font-bold mt-4 mb-2">${renderInline(line.slice(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2 class="text-lg font-semibold mt-3 mb-2">${renderInline(line.slice(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3 class="text-base font-medium mt-2 mb-1">${renderInline(line.slice(4))}</h3>`;
    }
    // 引用
    else if (line.startsWith('> ')) {
      html += `<blockquote class="border-l-4 border-primary/30 pl-3 my-2 text-muted-foreground italic">${renderInline(line.slice(2))}</blockquote>`;
    }
    // 无序列表
    else if (line.match(/^(-|\*)\s/)) {
      if (!inList || listType !== 'ul') {
        if (inList) html += '</ol>';
        html += '<ul class="list-disc list-inside my-1 space-y-0.5">';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${renderInline(line.replace(/^(-|\*)\s/, ''))}</li>`;
    }
    // 有序列表
    else if (line.match(/^\d+\.\s/)) {
      if (!inList || listType !== 'ol') {
        if (inList) html += '</ul>';
        html += '<ol class="list-decimal list-inside my-1 space-y-0.5">';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${renderInline(line.replace(/^\d+\.\s/, ''))}</li>`;
    }
    // 分隔线
    else if (line.match(/^---+$/)) {
      html += '<hr class="my-3 border-border"/>';
    }
    // 空行
    else if (line.trim() === '') {
      html += '<br/>';
    }
    // 普通段落
    else {
      html += `<p class="my-1">${renderInline(line)}</p>`;
    }
  }

  // 关闭未结束的元素
  if (inList) html += listType === 'ul' ? '</ul>' : '</ol>';
  if (inTable) html += parseTable(tableRows);
  if (inCodeBlock) html += '</code></pre>';

  return html;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({
  value,
  onChange,
  className,
  readonly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (readonly) {
    return (
      <div className={cn("h-full overflow-auto p-4", className)}>
        <div 
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-sm font-medium text-foreground">需求备注</span>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel}>
                取消
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleSave}>
                保存
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs gap-1"
              onClick={() => setIsEditing(true)}
            >
              {value ? <Edit2 className="h-3 w-3" /> : null}
              {value ? '编辑' : '添加备注'}
            </Button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={`# 决策表名称

## 原始需求
> 在此记录用户的原始需求描述...

## 需求解析

### 基本信息
- **编码**: DT_XXX
- **名称**: 
- **描述**: 

### 输入列
| 列名 | 类型 | 说明 |
|------|------|------|
| xxx | string | xxx |

### 输出列
| 列名 | 类型 | 说明 |
|------|------|------|
| xxx | decimal | xxx |

### 规则摘要
共 X 条规则...

## 测试用例
| 用例 | 输入1 | 输入2 | 预期输出 |
|------|-------|-------|----------|
| TC01 | xxx | xxx | xxx |`}
            className="h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 font-mono text-sm"
          />
        ) : (
          <div className="h-full overflow-auto p-4">
            {value ? (
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                暂无备注，点击上方"添加备注"开始编写
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
