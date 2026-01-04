import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Upload, PlayCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { Column, Rule, TestCase, TestSuiteResult, generateId } from './types';
import { findMatchingRule, compareOutputs } from './ruleEngine';
import { TestCaseList } from './TestCaseList';
import { TestCaseDetail } from './TestCaseDetail';
import { TestCaseImportDialog } from './TestCaseImportDialog';
import { cn } from '@/lib/utils';

interface TestPanelProps {
  columns: Column[];
  rules: Rule[];
  onHighlightRule?: (ruleId: string | null) => void;
  standalone?: boolean;  // 独立模式（Tab 页内不使用 Collapsible）
  pendingImportCases?: TestCase[];  // 待导入的测试用例（来自 AI 生成）
  onImportComplete?: () => void;  // 导入完成回调
  className?: string;
}

export const TestPanel: React.FC<TestPanelProps> = ({
  columns,
  rules,
  onHighlightRule,
  standalone = false,
  pendingImportCases = [],
  onImportComplete,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 处理待导入的测试用例
  useEffect(() => {
    if (pendingImportCases.length > 0) {
      setTestCases(prev => [...prev, ...pendingImportCases]);
      // 选中第一个导入的用例
      if (pendingImportCases[0]) {
        setSelectedCaseId(pendingImportCases[0].id);
      }
      onImportComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingImportCases]);

  const selectedCase = useMemo(
    () => testCases.find(c => c.id === selectedCaseId) || null,
    [testCases, selectedCaseId]
  );

  const suiteResult = useMemo<TestSuiteResult | null>(() => {
    const executed = testCases.filter(c => c.status && c.status !== 'pending');
    if (executed.length === 0) return null;

    return {
      total: testCases.length,
      passed: testCases.filter(c => c.status === 'passed').length,
      failed: testCases.filter(c => c.status === 'failed').length,
      noMatch: testCases.filter(c => c.status === 'no-match').length,
    };
  }, [testCases]);

  // 选中用例时高亮匹配的规则
  useEffect(() => {
    if (selectedCase?.matchedRuleId) {
      onHighlightRule?.(selectedCase.matchedRuleId);
    } else {
      onHighlightRule?.(null);
    }
  }, [selectedCaseId, selectedCase?.matchedRuleId, onHighlightRule]);

  const handleAddCase = () => {
    const newCase: TestCase = {
      id: generateId(),
      name: `用例 ${testCases.length + 1}`,
      inputs: {},
      expectedOutputs: {},
      status: 'pending',
    };
    setTestCases(prev => [...prev, newCase]);
    setSelectedCaseId(newCase.id);
  };

  const handleDeleteCase = (id: string) => {
    setTestCases(prev => prev.filter(c => c.id !== id));
    if (selectedCaseId === id) {
      setSelectedCaseId(null);
      onHighlightRule?.(null);
    }
  };

  const handleUpdateCase = (updated: TestCase) => {
    setTestCases(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const runSingleTest = (testCase: TestCase): TestCase => {
    const result = findMatchingRule(testCase.inputs, columns, rules);

    if (!result.matched) {
      return {
        ...testCase,
        status: 'no-match',
        actualOutputs: {},
        matchedRuleId: undefined,
      };
    }

    const hasExpected = Object.keys(testCase.expectedOutputs).some(
      k => testCase.expectedOutputs[k]
    );

    if (hasExpected) {
      const comparison = compareOutputs(testCase.expectedOutputs, result.outputs, columns);
      return {
        ...testCase,
        status: comparison.passed ? 'passed' : 'failed',
        actualOutputs: result.outputs,
        matchedRuleId: result.rule?.id,
      };
    }

    return {
      ...testCase,
      status: 'passed',
      actualOutputs: result.outputs,
      matchedRuleId: result.rule?.id,
    };
  };

  const handleRunSingle = () => {
    if (!selectedCase) return;
    const updated = runSingleTest(selectedCase);
    handleUpdateCase(updated);
  };

  const handleRunAll = () => {
    const updatedCases = testCases.map(tc => runSingleTest(tc));
    setTestCases(updatedCases);
  };

  const handleImport = (cases: TestCase[]) => {
    setTestCases(prev => [...prev, ...cases]);
  };

  // 内部内容组件
  const renderContent = () => (
    <div className={cn("flex flex-col h-full", standalone ? "w-full" : "w-64")}>
      {/* 操作栏 */}
      <div className="flex items-center gap-1 p-2 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleAddCase}
        >
          <Plus className="h-3 w-3" />
          添加
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => {
            // 先让当前活跃元素失焦，避免粘贴到决策表
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            setImportDialogOpen(true);
          }}
        >
          <Upload className="h-3 w-3" />
          导入
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleRunAll}
          disabled={testCases.length === 0}
        >
          <PlayCircle className="h-3 w-3" />
          全部执行
        </Button>
      </div>

      {/* 用例列表 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TestCaseList
          cases={testCases}
          selectedId={selectedCaseId}
          onSelect={setSelectedCaseId}
          onDelete={handleDeleteCase}
          columns={columns}
        />
      </div>

      {/* 统计信息 */}
      {suiteResult && (
        <div className="shrink-0 px-3 py-2 border-t border-border text-xs flex items-center gap-3">
          <span className="text-muted-foreground">
            共 {suiteResult.total}
          </span>
          <span className="text-green-600">✓ {suiteResult.passed}</span>
          <span className="text-destructive">✗ {suiteResult.failed}</span>
          {suiteResult.noMatch > 0 && (
            <span className="text-amber-500">⚠ {suiteResult.noMatch}</span>
          )}
        </div>
      )}

      {/* 详情面板 */}
      <TestCaseDetail
        testCase={selectedCase}
        columns={columns}
        onChange={handleUpdateCase}
        onRun={handleRunSingle}
        onDelete={() => selectedCaseId && handleDeleteCase(selectedCaseId)}
      />
    </div>
  );

  // 独立模式：不使用 Collapsible
  if (standalone) {
    return (
      <div className={cn('bg-muted/20 flex flex-col', className)}>
        {/* 标题栏 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
          <span className="font-medium text-sm text-foreground">测试面板</span>
          {testCases.length > 0 && (
            <span className="text-xs text-muted-foreground">({testCases.length})</span>
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>

        {/* 导入弹窗 */}
        <TestCaseImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          columns={columns}
          onImport={handleImport}
        />
      </div>
    );
  }

  // 折叠模式
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('border-l border-border bg-muted/20 flex flex-col', className)}
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 border-b border-border shrink-0">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm text-foreground">测试面板</span>
          {testCases.length > 0 && (
            <span className="text-xs text-muted-foreground">({testCases.length})</span>
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </CollapsibleContent>

      {/* 导入弹窗 */}
      <TestCaseImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        columns={columns}
        onImport={handleImport}
      />
    </Collapsible>
  );
};
