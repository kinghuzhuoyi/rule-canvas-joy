import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { TestCase, Column, DATA_TYPE_ICONS } from './types';
import { cn } from '@/lib/utils';

interface TestCaseDetailProps {
  testCase: TestCase | null;
  columns: Column[];
  onChange: (updated: TestCase) => void;
  onRun: () => void;
  onDelete: () => void;
}

export const TestCaseDetail: React.FC<TestCaseDetailProps> = ({
  testCase,
  columns,
  onChange,
  onRun,
  onDelete,
}) => {
  if (!testCase) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground border-t border-border">
        选择一个用例查看详情
      </div>
    );
  }

  const inputColumns = columns.filter(c => c.isInput);
  const outputColumns = columns.filter(c => !c.isInput);

  const handleInputChange = (columnId: string, value: string) => {
    onChange({
      ...testCase,
      inputs: { ...testCase.inputs, [columnId]: value },
      status: 'pending',
      actualOutputs: undefined,
      matchedRuleId: undefined,
    });
  };

  const handleExpectedChange = (columnId: string, value: string) => {
    onChange({
      ...testCase,
      expectedOutputs: { ...testCase.expectedOutputs, [columnId]: value },
    });
  };

  const handleNameChange = (name: string) => {
    onChange({ ...testCase, name });
  };

  const renderInput = (
    column: Column,
    value: string,
    onValueChange: (v: string) => void,
    disabled?: boolean
  ) => {
    const icon = DATA_TYPE_ICONS[column.dataType];

    if (column.dataType === 'boolean') {
      return (
        <Select value={value || ''} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="选择..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <div className="relative">
        <Input
          value={value || ''}
          onChange={e => onValueChange(e.target.value)}
          placeholder={
            column.dataType === 'integer'
              ? '整数'
              : column.dataType === 'decimal'
              ? '数值'
              : '值'
          }
          className="h-7 text-xs pr-5"
          disabled={disabled}
        />
        <span
          className={cn(
            'absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono',
            icon.color
          )}
        >
          {icon.icon}
        </span>
      </div>
    );
  };

  const getStatusDisplay = () => {
    if (!testCase.status || testCase.status === 'pending') return null;

    if (testCase.status === 'passed') {
      return (
        <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded text-sm text-green-600">
          <Check className="h-4 w-4" />
          <span>验证通过</span>
        </div>
      );
    }

    if (testCase.status === 'failed') {
      return (
        <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
          <X className="h-4 w-4" />
          <span>验证失败</span>
        </div>
      );
    }

    if (testCase.status === 'no-match') {
      return (
        <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <span>未匹配规则</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 border-t border-border">
      {/* 可滚动内容区 */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-2">
          {/* 输入参数 */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              输入
            </Label>
            {inputColumns.map(col => (
              <div key={col.id} className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-16 shrink-0 truncate">{col.name}</Label>
                <div className="flex-1">
                  {renderInput(col, testCase.inputs[col.id] || '', v =>
                    handleInputChange(col.id, v)
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 预期输出 */}
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              预期
            </Label>
            {outputColumns.map(col => (
              <div key={col.id} className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-16 shrink-0 truncate">{col.name}</Label>
                <div className="flex-1">
                  {renderInput(col, testCase.expectedOutputs[col.id] || '', v =>
                    handleExpectedChange(col.id, v)
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 实际输出（执行后显示） */}
          {testCase.actualOutputs && Object.keys(testCase.actualOutputs).length > 0 && (
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                实际
              </Label>
              <div className="bg-muted/50 rounded px-2 py-1 space-y-0.5">
                {outputColumns.map(col => {
                  const actual = testCase.actualOutputs?.[col.id] || '-';
                  const expected = testCase.expectedOutputs[col.id];
                  const isMatch = !expected || actual === expected;

                  return (
                    <div key={col.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{col.name}:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-foreground">{actual}</span>
                        {expected && (
                          isMatch ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-destructive" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 操作按钮 + 状态 - 固定在底部 */}
      <div className="shrink-0 flex items-center gap-2 p-2 border-t border-border">
        {testCase.status === 'passed' && (
          <Check className="h-4 w-4 text-green-600 shrink-0" />
        )}
        {testCase.status === 'failed' && (
          <X className="h-4 w-4 text-destructive shrink-0" />
        )}
        {testCase.status === 'no-match' && (
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        )}
        <Button size="sm" className="flex-1 gap-1 h-6 text-xs" onClick={onRun}>
          <Play className="h-3 w-3" />
          执行
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
