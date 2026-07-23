import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ChevronDown, Variable as VarIcon, Hash, Sigma } from 'lucide-react';
import {
  InputExpr,
  FUNCTIONS,
  FunctionName,
  DataType,
  DATA_TYPE_LABELS,
  expressionToString,
  inferExprDataType,
  Variable as VariableType,
} from './types';
import { VariableSelector } from './VariableSelector';
import { cn } from '@/lib/utils';

interface ExpressionBuilderProps {
  value?: InputExpr | null;
  onChange: (expr: InputExpr | null) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NodeProps {
  expr: InputExpr | null;
  onChange: (expr: InputExpr | null) => void;
  depth?: number;
}

const ExprNode: React.FC<NodeProps> = ({ expr, onChange, depth = 0 }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!expr) {
    return (
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-dashed',
              'border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors'
            )}
          >
            <ChevronDown className="h-3 w-3" />
            选择
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="start" side="bottom">
          <PickerMenu
            onPickVariable={(v) => {
              onChange({
                kind: 'variable',
                variableId: v.id,
                code: v.name,
                label: v.label,
                dataType: v.dataType,
              });
              setPickerOpen(false);
            }}
            onPickConstant={(dataType) => {
              onChange({ kind: 'constant', value: '', dataType });
              setPickerOpen(false);
            }}
            onPickFunction={(name) => {
              const def = FUNCTIONS.find((f) => f.name === name)!;
              onChange({
                kind: 'function',
                name,
                args: Array(def.argCount).fill(null),
              });
              setPickerOpen(false);
            }}
            onCancel={() => setPickerOpen(false)}
          />
        </PopoverContent>
      </Popover>
    );
  }

  const removeBtn = (
    <button
      className="text-muted-foreground hover:text-destructive transition-colors"
      onClick={() => onChange(null)}
      title="清除"
    >
      <X className="h-3 w-3" />
    </button>
  );

  if (expr.kind === 'variable') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
        <VarIcon className="h-3 w-3" />
        <span className="font-mono">{expr.code}</span>
        {removeBtn}
      </span>
    );
  }

  if (expr.kind === 'constant') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-amber-500/10 border border-amber-500/30">
        <Hash className="h-3 w-3 text-amber-600" />
        {expr.dataType === 'boolean' ? (
          <Select
            value={expr.value || 'true'}
            onValueChange={(v) => onChange({ ...expr, value: v })}
          >
            <SelectTrigger className="h-6 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={expr.value}
            onChange={(e) => onChange({ ...expr, value: e.target.value })}
            className="h-6 w-24 text-xs"
            placeholder={expr.dataType === 'string' ? '文本' : '数值'}
          />
        )}
        {removeBtn}
      </span>
    );
  }

  // function
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-purple-500/10 border border-purple-500/30">
      <Sigma className="h-3 w-3 text-purple-600" />
      <span className="font-mono font-medium">{expr.name}</span>
      <span>(</span>
      {expr.args.map((arg, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground">,</span>}
          <ExprNode
            expr={arg}
            depth={depth + 1}
            onChange={(next) => {
              const newArgs = [...expr.args];
              newArgs[i] = next;
              onChange({ ...expr, args: newArgs });
            }}
          />
        </React.Fragment>
      ))}
      <span>)</span>
      {removeBtn}
    </span>
  );
};

const PickerMenu: React.FC<{
  onPickVariable: (v: VariableType) => void;
  onPickConstant: (dataType: DataType) => void;
  onPickFunction: (name: FunctionName) => void;
  onCancel: () => void;
}> = ({ onPickVariable, onPickConstant, onPickFunction, onCancel }) => {
  const [tab, setTab] = useState<'variable' | 'function' | 'constant'>('variable');

  return (
    <div className="flex flex-col bg-card border border-border rounded-lg shadow-lg min-w-[300px]">
      <div className="flex border-b border-border">
        {[
          { key: 'variable', label: '变量' },
          { key: 'function', label: '函数' },
          { key: 'constant', label: '常量' },
        ].map((t) => (
          <button
            key={t.key}
            className={cn(
              'flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setTab(t.key as typeof tab)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'variable' && (
        <VariableSelector onSelect={onPickVariable} onCancel={onCancel} />
      )}

      {tab === 'function' && (
        <div className="p-2 flex flex-col gap-1">
          {FUNCTIONS.map((f) => (
            <button
              key={f.name}
              className="text-left px-3 py-2 rounded-md hover:bg-accent text-sm"
              onClick={() => onPickFunction(f.name)}
            >
              <div className="font-mono font-medium">{f.name}</div>
              <div className="text-xs text-muted-foreground">
                {f.label} · 返回 {DATA_TYPE_LABELS[f.returnType]}
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === 'constant' && (
        <div className="p-3 flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">选择常量类型：</div>
          {(['string', 'integer', 'decimal', 'boolean'] as DataType[]).map((dt) => (
            <button
              key={dt}
              className="text-left px-3 py-2 rounded-md hover:bg-accent text-sm border border-border"
              onClick={() => onPickConstant(dt)}
            >
              {DATA_TYPE_LABELS[dt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ExpressionBuilder: React.FC<ExpressionBuilderProps> = ({
  value,
  onChange,
  onConfirm,
  onCancel,
}) => {
  const [expr, setExpr] = useState<InputExpr | null>(value ?? null);

  const handleConfirm = () => {
    if (expr) {
      onChange(expr);
      onConfirm?.();
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 min-w-[320px]">
      <div className="text-xs font-medium text-muted-foreground">构建输入表达式</div>
      <div className="min-h-[36px] p-2 rounded border border-border bg-muted/30 flex flex-wrap items-center gap-1">
        <ExprNode
          expr={expr}
          onChange={(next) => setExpr(next)}
        />
      </div>
      {expr && (
        <div className="text-xs text-muted-foreground font-mono px-1">
          预览：{expressionToString(expr)}
          <span className="ml-2 px-1.5 py-0.5 rounded bg-secondary text-[10px]">
            {DATA_TYPE_LABELS[inferExprDataType(expr)]}
          </span>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={!expr}>
          确定
        </Button>
      </div>
    </div>
  );
};
