import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Shield } from 'lucide-react';
import { Column, Rule } from './types';
import { CellInput } from './CellInput';
import { cn } from '@/lib/utils';

interface RuleRowProps {
  rule: Rule;
  columns: Column[];
  onCellChange: (ruleId: string, columnId: string, value: string) => void;
  onDelete: (ruleId: string) => void;
  isCellSelected: (ruleId: string, columnId: string) => boolean;
  onCellMouseDown: (ruleId: string, columnId: string, e: React.MouseEvent) => void;
  onCellMouseEnter: (ruleId: string, columnId: string) => void;
  canDelete: boolean;
  isHighlighted?: boolean;
  isFallback?: boolean;
  readOnly?: boolean;
}

export const RuleRow: React.FC<RuleRowProps> = ({
  rule,
  columns,
  onCellChange,
  onDelete,
  isCellSelected,
  onCellMouseDown,
  onCellMouseEnter,
  canDelete,
  isHighlighted = false,
  isFallback = false,
  readOnly = false,
}) => {
  const sortable = useSortable({ id: rule.id, disabled: isFallback || readOnly });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  const inputColumns = columns.filter(c => c.isInput);
  const outputColumns = columns.filter(c => !c.isInput);
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex border-b border-border bg-card min-w-max transition-colors",
        isDragging && "opacity-50 shadow-lg z-10",
        isHighlighted && "bg-primary/10 ring-2 ring-primary/50 ring-inset",
        isFallback && "border-t-2 border-t-border"
      )}
    >
      {/* 拖拽手柄 / 兜底标识 - sticky left */}
      <div
        className={cn(
          "w-8 flex-shrink-0 flex items-center justify-center border-r border-border sticky left-0 z-10",
          isFallback || readOnly ? "bg-muted/50" : "bg-muted/50 cursor-grab active:cursor-grabbing"
        )}
        {...(isFallback || readOnly ? {} : attributes)}
        {...(isFallback || readOnly ? {} : listeners)}
        title={isFallback ? '兜底默认行（永远匹配）' : undefined}
      >
        {isFallback
          ? <Shield className="h-4 w-4 text-muted-foreground" />
          : <GripVertical className="h-4 w-4 text-muted-foreground" />}
      </div>
      
      {/* 输入列单元格 */}
      <div className={cn("flex", isFallback ? "bg-muted/30" : "bg-secondary/10")}>
        {inputColumns.map(column => (
          <div
            key={column.id}
            className="w-[140px] flex-shrink-0 h-10 border-r border-border"
          >
            {isFallback ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                任意
              </div>
            ) : (
              <CellInput
                value={rule.cells[column.id] || ''}
                dataType={column.dataType}
                isInput={true}
                isSelected={isCellSelected(rule.id, column.id)}
                onChange={value => onCellChange(rule.id, column.id, value)}
                onMouseDown={e => onCellMouseDown(rule.id, column.id, e)}
                onMouseEnter={() => onCellMouseEnter(rule.id, column.id)}
                readOnly={readOnly}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* 分隔线 */}
      <div className="w-1 bg-border flex-shrink-0" />
      
      {/* 输出列单元格 */}
      <div className="flex bg-primary/5">
        {outputColumns.map(column => (
          <div
            key={column.id}
            className="w-[140px] flex-shrink-0 h-10 border-r border-border"
          >
            <CellInput
              value={rule.cells[column.id] || ''}
              dataType={column.dataType}
              isInput={false}
              isSelected={isCellSelected(rule.id, column.id)}
              onChange={value => onCellChange(rule.id, column.id, value)}
              onMouseDown={e => onCellMouseDown(rule.id, column.id, e)}
              onMouseEnter={() => onCellMouseEnter(rule.id, column.id)}
              readOnly={readOnly}
            />
          </div>
        ))}
      </div>
      
      {/* 删除按钮 - sticky right */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center bg-muted/50 border-l border-border sticky right-0 z-10">
        {!isFallback && !readOnly && canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(rule.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

