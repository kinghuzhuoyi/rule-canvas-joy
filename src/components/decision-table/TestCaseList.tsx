import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Circle, AlertTriangle, Trash2 } from 'lucide-react';
import { TestCase, TestStatus, Column } from './types';
import { cn } from '@/lib/utils';

interface TestCaseListProps {
  cases: TestCase[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  columns: Column[];
}

const statusConfig: Record<TestStatus, { icon: React.ReactNode; className: string }> = {
  pending: {
    icon: <Circle className="h-3.5 w-3.5" />,
    className: 'text-muted-foreground',
  },
  passed: {
    icon: <Check className="h-3.5 w-3.5" />,
    className: 'text-green-600',
  },
  failed: {
    icon: <X className="h-3.5 w-3.5" />,
    className: 'text-destructive',
  },
  'no-match': {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    className: 'text-amber-500',
  },
};

export const TestCaseList: React.FC<TestCaseListProps> = ({
  cases,
  selectedId,
  onSelect,
  onDelete,
  columns,
}) => {
  const inputColumns = columns.filter(c => c.isInput);

  const getInputSummary = (testCase: TestCase): string => {
    return inputColumns
      .slice(0, 2)
      .map(col => testCase.inputs[col.id] || '-')
      .join(', ');
  };

  if (cases.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        暂无测试用例
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {cases.map((testCase, index) => {
          const status = testCase.status || 'pending';
          const config = statusConfig[status];
          const isSelected = selectedId === testCase.id;

          return (
            <div
              key={testCase.id}
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
                isSelected
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-muted/50 border border-transparent'
              )}
              onClick={() => onSelect(testCase.id)}
            >
              {/* 序号 */}
              <span className="text-xs text-muted-foreground w-5 shrink-0">
                #{index + 1}
              </span>

              {/* 状态图标 */}
              <span className={cn('shrink-0', config.className)}>
                {config.icon}
              </span>

              {/* 用例名称/摘要 */}
              <span className="flex-1 text-sm truncate text-foreground">
                {testCase.name || getInputSummary(testCase)}
              </span>

              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(testCase.id);
                }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
