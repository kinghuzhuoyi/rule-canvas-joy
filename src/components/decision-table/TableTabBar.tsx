import React from 'react';
import { useDecisionTableContext } from '@/contexts/DecisionTableContext';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableTabBarProps {
  className?: string;
  showApiDocs?: boolean;
  onToggleApiDocs?: () => void;
}

export const TableTabBar: React.FC<TableTabBarProps> = ({ className, showApiDocs, onToggleApiDocs }) => {
  const { tables, activeTableId, setActiveTable, createTable, deleteTable } = useDecisionTableContext();

  const handleAddTable = () => {
    createTable();
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
          {tables.map((table) => (
            <button
              key={table.id}
              onClick={() => { setActiveTable(table.id); if (showApiDocs) onToggleApiDocs?.(); }}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                "hover:bg-accent/50",
                activeTableId === table.id && !showApiDocs
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground"
              )}
            >
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
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
      
      <div className="flex items-center gap-1 px-2 border-l border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddTable}
          className="h-7 w-7 p-0"
          aria-label="新建决策表"
        >
          <Plus className="w-4 h-4" />
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
