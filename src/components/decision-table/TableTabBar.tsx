import React, { useState } from 'react';
import { useDecisionTableContext } from '@/contexts/DecisionTableContext';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, X, BookOpen, Variable, Table2, Shield, Code } from 'lucide-react';
import { ComponentType } from './types';
import { cn } from '@/lib/utils';

interface TableTabBarProps {
  className?: string;
  showApiDocs?: boolean;
  onToggleApiDocs?: () => void;
  showVariableManager?: boolean;
  onToggleVariableManager?: () => void;
}

const TYPE_ICONS: Record<ComponentType, React.ElementType> = {
  decision_table: Table2,
  rule: Shield,
  script: Code,
};

export const TableTabBar: React.FC<TableTabBarProps> = ({
  className,
  showApiDocs,
  onToggleApiDocs,
  showVariableManager,
  onToggleVariableManager,
}) => {
  const { tables, activeTableId, setActiveTable, createTable, deleteTable } = useDecisionTableContext();

  const handleAddTable = (type: ComponentType) => {
    createTable({ type });
  };

  const handleDeleteTable = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation();
    if (tables.length > 1) {
      deleteTable(tableId);
    }
  };

  return (
    <div className={cn("flex items-center border-b border-border bg-muted/30", className)}>
      <ScrollArea className="flex-1">
        <div className="flex items-center px-2 py-1.5 gap-1">
          {tables.map((table) => {
            const Icon = TYPE_ICONS[(table as any).type || 'decision_table'];
            return (
              <button
                key={table.id}
                onClick={() => {
                  setActiveTable(table.id);
                  if (showApiDocs) onToggleApiDocs?.();
                  if (showVariableManager) onToggleVariableManager?.();
                }}
                className={cn(
                  "group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  "hover:bg-accent/50",
                  activeTableId === table.id && !showApiDocs && !showVariableManager
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[120px]">{table.meta.name}</span>
                <span className="text-xs text-muted-foreground/70">{table.meta.code}</span>
                {tables.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteTable(e, table.id)}
                    className={cn(
                      "ml-1 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors",
                      "opacity-0 group-hover:opacity-100"
                    )}
                    aria-label="关闭标签"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
      
      <div className="flex items-center gap-1 px-2 border-l border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              aria-label="新建组件"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleAddTable('decision_table')}>
              <Table2 className="w-4 h-4 mr-2" />
              决策表
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddTable('rule')}>
              <Shield className="w-4 h-4 mr-2" />
              规则
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddTable('script')}>
              <Code className="w-4 h-4 mr-2" />
              脚本
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant={showVariableManager ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleVariableManager}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <Variable className="w-3.5 h-3.5" />
          变量
        </Button>
        <Button
          variant={showApiDocs ? "secondary" : "ghost"}
          size="sm"
          onClick={onToggleApiDocs}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Open API
        </Button>
      </div>
    </div>
  );
};
