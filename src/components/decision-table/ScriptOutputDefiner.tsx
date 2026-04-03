import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { ScriptOutput, DataType, DATA_TYPE_LABELS, generateId } from './types';
import { cn } from '@/lib/utils';

interface ScriptOutputDefinerProps {
  outputs: ScriptOutput[];
  onChange: (outputs: ScriptOutput[]) => void;
  className?: string;
}

export const ScriptOutputDefiner: React.FC<ScriptOutputDefinerProps> = ({
  outputs,
  onChange,
  className,
}) => {
  const handleAdd = () => {
    onChange([
      ...outputs,
      { id: generateId(), code: '', name: '', dataType: 'string' },
    ]);
  };

  const handleUpdate = (id: string, field: keyof ScriptOutput, value: string) => {
    onChange(outputs.map(o => o.id === id ? { ...o, [field]: value } : o));
  };

  const handleDelete = (id: string) => {
    onChange(outputs.filter(o => o.id !== id));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">输出定义</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleAdd}>
          <Plus className="h-3 w-3" />
          添加输出
        </Button>
      </div>

      {outputs.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_100px_40px] gap-2 px-3 py-1.5 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase border-b border-border">
            <span>编码</span>
            <span>名称</span>
            <span>类型</span>
            <span></span>
          </div>

          {/* Rows */}
          {outputs.map(o => (
            <div key={o.id} className="grid grid-cols-[1fr_1fr_100px_40px] gap-2 px-3 py-1.5 items-center border-b border-border last:border-b-0">
              <Input
                value={o.code}
                onChange={e => handleUpdate(o.id, 'code', e.target.value)}
                className="h-7 text-xs font-mono"
                placeholder="output_code"
              />
              <Input
                value={o.name}
                onChange={e => handleUpdate(o.id, 'name', e.target.value)}
                className="h-7 text-xs"
                placeholder="输出名称"
              />
              <Select value={o.dataType} onValueChange={v => handleUpdate(o.id, 'dataType', v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DATA_TYPE_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive/70 hover:text-destructive"
                onClick={() => handleDelete(o.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {outputs.length === 0 && (
        <div className="text-center text-muted-foreground text-xs py-4 border border-dashed border-border rounded-lg">
          暂无输出定义，点击"添加输出"
        </div>
      )}
    </div>
  );
};
