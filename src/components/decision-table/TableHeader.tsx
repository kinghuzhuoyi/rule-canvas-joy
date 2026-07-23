import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Column, DataType, InputExpr, DATA_TYPE_LABELS, DATA_TYPE_ICONS, expressionToString, inferExprDataType } from './types';
import { ExpressionBuilder } from './ExpressionBuilder';
import { cn } from '@/lib/utils';
interface TableHeaderProps {
  columns: Column[];
  onAddInputColumn: (expr: InputExpr, insertIndex?: number) => void;
  onAddOutputColumn: (code: string, name: string, dataType: DataType, insertIndex?: number) => void;
  onEditColumn: (columnId: string, code: string, name: string, dataType: DataType, inputExpr?: InputExpr) => void;
  onDeleteColumn: (columnId: string) => void;
  readOnly?: boolean;
}


// 输出列定义表单（编码 / 名称 / 类型）
interface OutputColumnFormProps {
  initialCode?: string;
  initialName?: string;
  initialType?: DataType;
  submitLabel?: string;
  onSubmit: (code: string, name: string, dataType: DataType) => void;
  onCancel: () => void;
}
const OutputColumnForm: React.FC<OutputColumnFormProps> = ({
  initialCode = '',
  initialName = '',
  initialType = 'string',
  submitLabel = '添加',
  onSubmit,
  onCancel,
}) => {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(initialName);
  const [dataType, setDataType] = useState<DataType>(initialType);
  const canSubmit = code.trim() && name.trim();
  return (
    <div className="flex flex-col gap-2 min-w-[240px]">
      <Input placeholder="编码，如 age_level" value={code} onChange={e => setCode(e.target.value)} className="h-8 text-sm font-mono" autoFocus />
      <Input placeholder="名称，如 年龄分层" value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm" />
      <Select value={dataType} onValueChange={v => setDataType(v as DataType)}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="字段类型" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(DATA_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-7" disabled={!canSubmit} onClick={() => canSubmit && onSubmit(code.trim(), name.trim(), dataType)}>
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>取消</Button>
      </div>
    </div>
  );
};

// 列间分隔线组件 - 悬浮显示添加按钮
interface ColumnDividerProps {
  isInput: boolean;
  insertIndex: number;
  onAddInput?: (expr: InputExpr) => void;
  onAddOutput?: (code: string, name: string, dataType: DataType) => void;
}
const ColumnDivider: React.FC<ColumnDividerProps> = ({
  isInput,
  insertIndex,
  onAddInput,
  onAddOutput
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  return <div className="relative w-0 flex-shrink-0 group/divider" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => !showSelector && setIsHovered(false)}>
      <div className={cn("absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary transition-opacity duration-200", isHovered ? "opacity-100" : "opacity-0")} />

      <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20", "transition-all duration-200", isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none")}>
        {isInput ? <Popover open={showSelector} onOpenChange={open => {
        setShowSelector(open);
        if (!open) setIsHovered(false);
      }}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="outline" className="h-6 w-6 rounded-full bg-card shadow-md border-primary/50 hover:bg-primary hover:text-primary-foreground">
                <Plus className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-auto" align="start">
              <ExpressionBuilder
                onChange={expr => {
                  if (expr) onAddInput?.(expr);
                }}
                onConfirm={() => { setShowSelector(false); setIsHovered(false); }}
                onCancel={() => { setShowSelector(false); setIsHovered(false); }}
              />
            </PopoverContent>
          </Popover> : <Popover open={showSelector} onOpenChange={open => {
        setShowSelector(open);
        if (!open) setIsHovered(false);
      }}>
            <PopoverTrigger asChild>
              <Button size="icon" variant="outline" className="h-6 w-6 rounded-full bg-card shadow-md border-primary/50 hover:bg-primary hover:text-primary-foreground">
                <Plus className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-3 w-auto" align="start">
              <OutputColumnForm
                onSubmit={(code, name, dataType) => {
                  onAddOutput?.(code, name, dataType);
                  setShowSelector(false);
                  setIsHovered(false);
                }}
                onCancel={() => { setShowSelector(false); setIsHovered(false); }}
              />
            </PopoverContent>
          </Popover>}
      </div>
    </div>;
};

export const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  onAddInputColumn,
  onAddOutputColumn,
  onEditColumn,
  onDeleteColumn,
  readOnly = false,
}) => {
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const inputColumns = columns.filter(c => c.isInput);
  const outputColumns = columns.filter(c => !c.isInput);
  const canDeleteInput = inputColumns.length > 1;
  const canDeleteOutput = outputColumns.length > 1;
  const renderColumnHeader = (column: Column, canDelete: boolean) => {
    const dataType = column.isInput && column.inputExpr ? inferExprDataType(column.inputExpr) : column.dataType;
    const typeIcon = DATA_TYPE_ICONS[dataType] || { icon: '?', color: 'text-muted-foreground' };
    const displayName = column.isInput && column.inputExpr ? expressionToString(column.inputExpr) : column.name;
    const subLabel = !column.isInput && column.code ? column.code : undefined;
    return <div key={column.id} className={cn("group relative flex flex-col items-center justify-center p-2 w-[140px] flex-shrink-0", "border-r border-border last:border-r-0")}>
        <div className="flex items-center gap-1 max-w-full">
          <span className={cn("font-mono text-xs", typeIcon.color)}>{typeIcon.icon}</span>
          <span className="font-medium text-sm truncate" title={displayName}>{displayName}</span>

          <Popover open={!readOnly && editingColumn?.id === column.id} onOpenChange={open => {
          if (readOnly) return;
          if (open) {
            setEditingColumn(column);
          } else {
            setEditingColumn(null);
          }
        }}>
            <PopoverTrigger asChild>
              <button
                disabled={readOnly}
                className={cn(
                  "opacity-0 transition-opacity p-0.5 hover:bg-accent rounded flex-shrink-0",
                  !readOnly && "group-hover:opacity-100",
                  readOnly && "hidden"
                )}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="p-3 w-auto" align="start">
              <div className="flex flex-col gap-2">
                {column.isInput ? (
                  <ExpressionBuilder
                    value={column.inputExpr}
                    onChange={(expr) => {
                      if (expr) onEditColumn(column.id, column.code || '', expressionToString(expr), inferExprDataType(expr), expr);
                    }}
                    onConfirm={() => setEditingColumn(null)}
                    onCancel={() => setEditingColumn(null)}
                  />
                ) : (
                  <OutputColumnForm
                    initialCode={column.code || ''}
                    initialName={column.name}
                    initialType={column.dataType}
                    submitLabel="保存"
                    onSubmit={(code, name, dataType) => {
                      onEditColumn(column.id, code, name, dataType);
                      setEditingColumn(null);
                    }}
                    onCancel={() => setEditingColumn(null)}
                  />
                )}
                {canDelete && <Button size="sm" variant="destructive" className="h-7 w-full" onClick={() => {
                onDeleteColumn(column.id);
                setEditingColumn(null);
              }}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    删除列
                  </Button>}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        {subLabel && (
          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-full mt-0.5" title={subLabel}>
            {subLabel}
          </span>
        )}
      </div>;
  };
  return <div className="flex sticky top-8 z-20 bg-card border-b border-border min-w-max">
      <div className="w-8 flex-shrink-0 bg-muted/50 border-r border-border sticky left-0 z-10" />

      <div className="flex bg-secondary/30">
        {inputColumns.length === 0 ? (
          readOnly ? (
            <div className="w-[140px] flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground/60">无输入</div>
          ) : (
            <EmptyColumnPlaceholder isInput onAddInput={expr => onAddInputColumn(expr, 0)} />
          )
        ) : (
          <>
            {inputColumns.map((col, index) => <React.Fragment key={col.id}>
                {!readOnly && <ColumnDivider isInput={true} insertIndex={index} onAddInput={expr => onAddInputColumn(expr, index)} />}
                {renderColumnHeader(col, canDeleteInput)}
              </React.Fragment>)}
            {!readOnly && <ColumnDivider isInput={true} insertIndex={inputColumns.length} onAddInput={expr => onAddInputColumn(expr, inputColumns.length)} />}
          </>
        )}
      </div>

      <div className="w-1 bg-border flex-shrink-0" />

      <div className="flex bg-primary/5">
        {outputColumns.length === 0 ? (
          readOnly ? (
            <div className="w-[140px] flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground/60">无输出</div>
          ) : (
            <EmptyColumnPlaceholder isInput={false} onAddOutput={(code, name, dataType) => onAddOutputColumn(code, name, dataType, 0)} />
          )
        ) : (
          <>
            {outputColumns.map((col, index) => <React.Fragment key={col.id}>
                {!readOnly && <ColumnDivider isInput={false} insertIndex={index} onAddOutput={(code, name, dataType) => onAddOutputColumn(code, name, dataType, index)} />}
                {renderColumnHeader(col, canDeleteOutput)}
              </React.Fragment>)}
            {!readOnly && <ColumnDivider isInput={false} insertIndex={outputColumns.length} onAddOutput={(code, name, dataType) => onAddOutputColumn(code, name, dataType, outputColumns.length)} />}
          </>
        )}
      </div>

      <div className="w-10 flex-shrink-0 bg-muted/50 border-l border-border sticky right-0 z-10" />
    </div>;
};

// 空状态占位单元格 - 引导用户添加第一列
interface EmptyColumnPlaceholderProps {
  isInput: boolean;
  onAddInput?: (expr: InputExpr) => void;
  onAddOutput?: (code: string, name: string, dataType: DataType) => void;
}
const EmptyColumnPlaceholder: React.FC<EmptyColumnPlaceholderProps> = ({ isInput, onAddInput, onAddOutput }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-[140px] flex-shrink-0 flex items-center justify-center p-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full h-9 flex items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            <span>添加{isInput ? '输入' : '输出'}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="start">
          {isInput ? (
            <ExpressionBuilder
              onChange={expr => { if (expr) onAddInput?.(expr); }}
              onConfirm={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          ) : (
            <div className="p-3">
              <OutputColumnForm
                onSubmit={(code, name, dataType) => {
                  onAddOutput?.(code, name, dataType);
                  setOpen(false);
                }}
                onCancel={() => setOpen(false)}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
