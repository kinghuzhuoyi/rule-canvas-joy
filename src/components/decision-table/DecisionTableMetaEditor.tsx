import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DecisionTableMeta } from './types';
import { MarkdownPreview } from './MarkdownPreview';
import { cn } from '@/lib/utils';

interface DecisionTableMetaEditorProps {
  meta: DecisionTableMeta;
  onChange: (meta: DecisionTableMeta) => void;
  readonly?: boolean;
  className?: string;
}

export const DecisionTableMetaEditor: React.FC<DecisionTableMetaEditorProps> = ({
  meta,
  onChange,
  readonly = false,
  className,
}) => {
  const handleChange = (field: keyof DecisionTableMeta, value: string) => {
    onChange({ ...meta, [field]: value });
  };

  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      <div className="flex items-start gap-4">
        {/* 编码 */}
        <div className="space-y-1.5 w-32 shrink-0">
          <Label htmlFor="code" className="text-xs font-medium text-muted-foreground">
            编码
          </Label>
          <Input
            id="code"
            value={meta.code}
            onChange={e => handleChange('code', e.target.value)}
            placeholder="DT_001"
            readOnly={readonly}
            className="font-mono text-sm h-[38px]"
          />
        </div>
        
        {/* 名称 */}
        <div className="space-y-1.5 w-48 shrink-0">
          <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
            名称
          </Label>
          <Input
            id="name"
            value={meta.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="决策表名称"
            readOnly={readonly}
            className="h-[38px]"
          />
        </div>
        
        {/* 描述 - 使用 MarkdownPreview */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">
            描述
          </Label>
          <MarkdownPreview
            value={meta.description}
            onChange={v => handleChange('description', v)}
            placeholder="点击添加描述（支持 Markdown）..."
            readonly={readonly}
          />
        </div>
      </div>
    </div>
  );
};
