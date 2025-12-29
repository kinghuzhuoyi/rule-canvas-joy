import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DecisionTableMeta } from './types';
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 编码 */}
        <div className="space-y-1.5">
          <Label htmlFor="code" className="text-sm font-medium text-foreground">
            编码
          </Label>
          <Input
            id="code"
            value={meta.code}
            onChange={e => handleChange('code', e.target.value)}
            placeholder="如：DT_001"
            readOnly={readonly}
            className="font-mono text-sm"
          />
        </div>
        
        {/* 名称 */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            名称
          </Label>
          <Input
            id="name"
            value={meta.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="决策表名称"
            readOnly={readonly}
          />
        </div>
        
        {/* 描述 */}
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-sm font-medium text-foreground">
            描述
          </Label>
          <Textarea
            id="description"
            value={meta.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="描述该决策表的用途..."
            readOnly={readonly}
            className="min-h-[38px] resize-none"
            rows={1}
          />
        </div>
      </div>
    </div>
  );
};
