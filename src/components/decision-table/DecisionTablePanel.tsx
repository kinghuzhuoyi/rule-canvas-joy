import React, { useState, useCallback, useEffect } from 'react';
import { useDecisionTableContext } from '@/contexts/DecisionTableContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DecisionTableMetaEditor } from './DecisionTableMetaEditor';
import { NotesEditor } from './NotesEditor';
import { DecisionTableEditor } from './DecisionTableEditor';
import { TestPanel } from './TestPanel';
import { DecisionTableMeta, Column, Rule, TestCase } from './types';
import { FileText, Table2, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecisionTablePanelProps {
  className?: string;
}

export const DecisionTablePanel: React.FC<DecisionTablePanelProps> = ({ className }) => {
  const { activeTable, updateTable } = useDecisionTableContext();
  const [activeTab, setActiveTab] = useState<string>('table');
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);

  // 如果没有活动表，显示提示
  if (!activeTable) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        <p>请选择或创建一个决策表</p>
      </div>
    );
  }

  // 处理元信息变化
  const handleMetaChange = useCallback((meta: DecisionTableMeta) => {
    updateTable(activeTable.id, { meta });
  }, [activeTable.id, updateTable]);

  // 处理备注变化
  const handleNotesChange = useCallback((notes: string) => {
    updateTable(activeTable.id, { notes });
  }, [activeTable.id, updateTable]);

  // 处理表格变化
  const handleTableChange = useCallback((data: { columns: Column[]; rules: Rule[] }) => {
    updateTable(activeTable.id, data);
  }, [activeTable.id, updateTable]);

  // 处理测试用例变化
  const handleTestCasesChange = useCallback((testCases: TestCase[]) => {
    updateTable(activeTable.id, { testCases });
  }, [activeTable.id, updateTable]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 顶部元信息编辑 */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <DecisionTableMetaEditor
          meta={activeTable.meta}
          onChange={handleMetaChange}
        />
      </div>

      {/* 标签页内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-2 border-b border-border">
          <TabsList className="h-9">
            <TabsTrigger value="notes" className="gap-1.5 text-xs px-3">
              <FileText className="w-3.5 h-3.5" />
              备注
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 text-xs px-3">
              <Table2 className="w-3.5 h-3.5" />
              决策表
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-1.5 text-xs px-3">
              <FlaskConical className="w-3.5 h-3.5" />
              测试
              {activeTable.testCases.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">
                  {activeTable.testCases.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="notes" className="flex-1 m-0 overflow-hidden">
          <NotesEditor
            value={activeTable.notes}
            onChange={handleNotesChange}
            className="h-full border-0"
          />
        </TabsContent>

        <TabsContent value="table" className="flex-1 m-0 overflow-hidden">
          <DecisionTableEditor
            initialData={{
              columns: activeTable.columns,
              rules: activeTable.rules,
            }}
            onChange={handleTableChange}
            highlightedRuleId={highlightedRuleId}
            className="h-full"
          />
        </TabsContent>

        <TabsContent value="test" className="flex-1 m-0 overflow-hidden">
          <TestPanel
            columns={activeTable.columns}
            rules={activeTable.rules}
            onHighlightRule={setHighlightedRuleId}
            testCases={activeTable.testCases}
            onTestCasesChange={handleTestCasesChange}
            standalone
            className="h-full border-0"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
