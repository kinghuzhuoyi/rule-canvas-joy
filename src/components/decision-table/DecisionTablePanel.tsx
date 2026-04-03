import React, { useState, useCallback, useMemo } from 'react';
import { useDecisionTableContext } from '@/contexts/DecisionTableContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DecisionTableMetaEditor } from './DecisionTableMetaEditor';
import { NotesEditor } from './NotesEditor';
import { DecisionTableEditor } from './DecisionTableEditor';
import { TestPanel } from './TestPanel';
import { RuleEditor } from './RuleEditor';
import { ScriptEditor } from './ScriptEditor';
import { DecisionTableMeta, Column, Rule, TestCase, RuleComponentConfig, ScriptComponentConfig, ComponentConfig } from './types';
import { FileText, Table2, FlaskConical, Shield, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecisionTablePanelProps {
  className?: string;
}

export const DecisionTablePanel: React.FC<DecisionTablePanelProps> = ({ className }) => {
  const { activeTable, updateTable } = useDecisionTableContext();
  const [activeTab, setActiveTab] = useState<string>('editor');
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);

  // Stable references via useMemo keyed on activeTable.id
  const tableId = activeTable?.id;

  const handleMetaChange = useCallback((meta: DecisionTableMeta) => {
    if (tableId) updateTable(tableId, { meta });
  }, [tableId, updateTable]);

  const handleNotesChange = useCallback((notes: string) => {
    if (tableId) updateTable(tableId, { notes });
  }, [tableId, updateTable]);

  const handleTableChange = useCallback((data: { columns: Column[]; rules: Rule[] }) => {
    if (tableId) updateTable(tableId, data);
  }, [tableId, updateTable]);

  const handleTestCasesChange = useCallback((testCases: TestCase[]) => {
    if (tableId) updateTable(tableId, { testCases });
  }, [tableId, updateTable]);

  const handleConfigChange = useCallback((config: ComponentConfig) => {
    if (tableId) updateTable(tableId, { config });
  }, [tableId, updateTable]);

  if (!activeTable) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        <p>请选择或创建一个组件</p>
      </div>
    );
  }

  const componentType = activeTable.type || 'decision_table';
  const editorLabel = componentType === 'rule' ? '规则' : componentType === 'script' ? '脚本' : '决策表';
  const EditorIcon = componentType === 'rule' ? Shield : componentType === 'script' ? Code : Table2;

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
            <TabsTrigger value="editor" className="gap-1.5 text-xs px-3">
              <EditorIcon className="w-3.5 h-3.5" />
              {editorLabel}
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

        <TabsContent value="editor" className="flex-1 m-0 overflow-hidden">
          {componentType === 'decision_table' && (
            <DecisionTableEditor
              initialData={{
                columns: activeTable.columns,
                rules: activeTable.rules,
              }}
              onChange={handleTableChange}
              highlightedRuleId={highlightedRuleId}
              className="h-full"
            />
          )}
          {componentType === 'rule' && (
            <RuleEditor
              config={activeTable.config as RuleComponentConfig}
              onChange={handleConfigChange}
              tableId={activeTable.id}
              className="h-full"
            />
          )}
          {componentType === 'script' && (
            <ScriptEditor
              config={activeTable.config as ScriptComponentConfig}
              onChange={handleConfigChange}
              tableId={activeTable.id}
              className="h-full"
            />
          )}
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
