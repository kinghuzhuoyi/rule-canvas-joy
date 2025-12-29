import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, ChevronRight, ChevronDown, Check, X, AlertCircle } from 'lucide-react';
import { Column, Rule, DATA_TYPE_ICONS } from './types';
import { findMatchingRule, compareOutputs } from './ruleEngine';
import { cn } from '@/lib/utils';

interface TestPanelProps {
  columns: Column[];
  rules: Rule[];
  onHighlightRule?: (ruleId: string | null) => void;
  className?: string;
}

interface TestResult {
  matched: boolean;
  matchedRuleId: string | null;
  actualOutputs: Record<string, string>;
  comparison?: ReturnType<typeof compareOutputs>;
}

export const TestPanel: React.FC<TestPanelProps> = ({
  columns,
  rules,
  onHighlightRule,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [expectedOutputs, setExpectedOutputs] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const inputColumns = useMemo(() => columns.filter(c => c.isInput), [columns]);
  const outputColumns = useMemo(() => columns.filter(c => !c.isInput), [columns]);

  const handleInputChange = (columnId: string, value: string) => {
    setInputs(prev => ({ ...prev, [columnId]: value }));
    // 清除之前的测试结果
    if (testResult) {
      setTestResult(null);
      onHighlightRule?.(null);
    }
  };

  const handleExpectedOutputChange = (columnId: string, value: string) => {
    setExpectedOutputs(prev => ({ ...prev, [columnId]: value }));
  };

  const handleRunTest = () => {
    const result = findMatchingRule(inputs, columns, rules);
    
    let comparison;
    if (result.matched && Object.keys(expectedOutputs).some(k => expectedOutputs[k])) {
      comparison = compareOutputs(expectedOutputs, result.outputs, columns);
    }
    
    setTestResult({
      matched: result.matched,
      matchedRuleId: result.rule?.id || null,
      actualOutputs: result.outputs,
      comparison,
    });
    
    onHighlightRule?.(result.rule?.id || null);
  };

  const handleClearTest = () => {
    setInputs({});
    setExpectedOutputs({});
    setTestResult(null);
    onHighlightRule?.(null);
  };

  const renderInput = (column: Column, value: string, onChange: (v: string) => void) => {
    const icon = DATA_TYPE_ICONS[column.dataType];
    
    if (column.dataType === 'boolean') {
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-sm">
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
          onChange={e => onChange(e.target.value)}
          placeholder={column.dataType === 'integer' ? '整数' : column.dataType === 'decimal' ? '数值' : '值'}
          className="h-8 text-sm pr-6"
        />
        <span className={cn("absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono", icon.color)}>
          {icon.icon}
        </span>
      </div>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("border-l border-border bg-muted/20", className)}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 border-b border-border">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm text-foreground">测试面板</span>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-3 space-y-4 w-64">
          {/* 输入参数 */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              输入参数
            </Label>
            {inputColumns.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无输入列</p>
            ) : (
              inputColumns.map(col => (
                <div key={col.id} className="space-y-1">
                  <Label className="text-xs text-foreground">{col.name}</Label>
                  {renderInput(col, inputs[col.id] || '', v => handleInputChange(col.id, v))}
                </div>
              ))
            )}
          </div>
          
          {/* 预期输出（可选） */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              预期输出 <span className="font-normal">(可选)</span>
            </Label>
            {outputColumns.length === 0 ? (
              <p className="text-xs text-muted-foreground">暂无输出列</p>
            ) : (
              outputColumns.map(col => (
                <div key={col.id} className="space-y-1">
                  <Label className="text-xs text-foreground">{col.name}</Label>
                  {renderInput(col, expectedOutputs[col.id] || '', v => handleExpectedOutputChange(col.id, v))}
                </div>
              ))
            )}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1" onClick={handleRunTest}>
              <Play className="h-3 w-3" />
              执行测试
            </Button>
            <Button size="sm" variant="outline" onClick={handleClearTest}>
              清除
            </Button>
          </div>
          
          {/* 测试结果 */}
          {testResult && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                测试结果
              </Label>
              
              {testResult.matched ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-foreground">匹配成功</span>
                  </div>
                  
                  {/* 实际输出 */}
                  <div className="bg-card rounded border border-border p-2 space-y-1">
                    <p className="text-xs text-muted-foreground">实际输出：</p>
                    {outputColumns.map(col => {
                      const actual = testResult.actualOutputs[col.id] || '-';
                      const compDetail = testResult.comparison?.details[col.id];
                      const hasExpected = expectedOutputs[col.id];
                      
                      return (
                        <div key={col.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{col.name}:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-foreground">{actual}</span>
                            {hasExpected && compDetail && (
                              compDetail.match ? (
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
                  
                  {/* 验证结果 */}
                  {testResult.comparison && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm p-2 rounded",
                      testResult.comparison.passed ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                    )}>
                      {testResult.comparison.passed ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>验证通过</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          <span>验证失败</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>未匹配到任何规则</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
