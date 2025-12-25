import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';
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
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });
  
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
        "flex border-b border-border bg-card",
        isDragging && "opacity-50 shadow-lg z-10"
      )}
    >
      {/* 拖拽手柄 */}
      <div
        className="w-8 flex-shrink-0 flex items-center justify-center bg-muted/50 border-r border-border cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* 输入列单元格 */}
      <div className="flex-1 flex overflow-x-auto bg-secondary/10">
        <div className="flex">
          {inputColumns.map(column => (
            <div
              key={column.id}
              className="min-w-[140px] h-10 border-r border-border"
            >
              <CellInput
                value={rule.cells[column.id] || ''}
                dataType={column.dataType}
                isInput={true}
                isSelected={isCellSelected(rule.id, column.id)}
                onChange={value => onCellChange(rule.id, column.id, value)}
                onMouseDown={e => onCellMouseDown(rule.id, column.id, e)}
                onMouseEnter={() => onCellMouseEnter(rule.id, column.id)}
              />
            </div>
          ))}
          {/* 添加列占位 */}
          <div className="min-w-[48px] border-r border-border" />
        </div>
      </div>
      
      {/* 分隔线 */}
      <div className="w-1 bg-border flex-shrink-0" />
      
      {/* 输出列单元格 */}
      <div className="flex-1 flex overflow-x-auto bg-primary/5">
        <div className="flex">
          {outputColumns.map(column => (
            <div
              key={column.id}
              className="min-w-[140px] h-10 border-r border-border"
            >
              <CellInput
                value={rule.cells[column.id] || ''}
                dataType={column.dataType}
                isInput={false}
                isSelected={isCellSelected(rule.id, column.id)}
                onChange={value => onCellChange(rule.id, column.id, value)}
                onMouseDown={e => onCellMouseDown(rule.id, column.id, e)}
                onMouseEnter={() => onCellMouseEnter(rule.id, column.id)}
              />
            </div>
          ))}
          {/* 添加列占位 */}
          <div className="min-w-[48px]" />
        </div>
      </div>
      
      {/* 删除按钮 */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center bg-muted/50 border-l border-border">
        {canDelete && (
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
