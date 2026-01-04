import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Table2, TestTube2 } from 'lucide-react';
import { Column, Rule, TestCase } from './types';
import { NotesEditor } from './NotesEditor';
import { DecisionTableEditor } from './DecisionTableEditor';
import { TestPanel } from './TestPanel';
import { cn } from '@/lib/utils';

interface ControllerPanelProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  columns: Column[];
  rules: Rule[];
  onTableChange: (data: { columns: Column[]; rules: Rule[] }) => void;
  highlightedRuleId: string | null;
  onHighlightRule: (ruleId: string | null) => void;
  pendingTestCases?: TestCase[];
  onTestCasesImported?: () => void;
  className?: string;
  defaultTab?: 'notes' | 'table' | 'test';
}

export const ControllerPanel: React.FC<ControllerPanelProps> = ({
  notes,
  onNotesChange,
  columns,
  rules,
  onTableChange,
  highlightedRuleId,
  onHighlightRule,
  pendingTestCases = [],
  onTestCasesImported,
  className,
  defaultTab = 'notes',
}) => {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // 当有待导入的测试用例时，自动切换到测试 Tab
  useEffect(() => {
    if (pendingTestCases.length > 0) {
      setActiveTab('test');
    }
  }, [pendingTestCases]);

  return (
    <Tabs 
      value={activeTab} 
      onValueChange={setActiveTab}
      className={cn("flex flex-col h-full", className)}
    >
      {/* Tab 切换栏 */}
      <div className="shrink-0 border-b border-border px-2 py-1.5 bg-muted/30">
        <TabsList className="h-8 w-full justify-start bg-transparent p-0 gap-1">
          <TabsTrigger 
            value="notes" 
            className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            备注
          </TabsTrigger>
          <TabsTrigger 
            value="table" 
            className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Table2 className="h-3.5 w-3.5" />
            决策表
          </TabsTrigger>
          <TabsTrigger 
            value="test" 
            className="h-7 px-3 text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <TestTube2 className="h-3.5 w-3.5" />
            测试
            {pendingTestCases.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                {pendingTestCases.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab 内容区 */}
      <TabsContent value="notes" className="flex-1 m-0 overflow-hidden">
        <NotesEditor
          value={notes}
          onChange={onNotesChange}
          className="h-full"
        />
      </TabsContent>

      <TabsContent value="table" className="flex-1 m-0 overflow-hidden">
        <DecisionTableEditor
          initialData={{ columns, rules }}
          onChange={onTableChange}
          highlightedRuleId={highlightedRuleId}
          className="h-full border-0 rounded-none"
        />
      </TabsContent>

      <TabsContent value="test" className="flex-1 m-0 overflow-hidden">
        <TestPanel
          columns={columns}
          rules={rules}
          onHighlightRule={onHighlightRule}
          pendingImportCases={pendingTestCases}
          onImportComplete={onTestCasesImported}
          standalone
          className="h-full border-0"
        />
      </TabsContent>
    </Tabs>
  );
};
