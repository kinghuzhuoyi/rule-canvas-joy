import React, { useState, useCallback, useEffect } from 'react';
import { DecisionTableMeta, DecisionTableFullData, Column, Rule, generateId } from './types';
import { DecisionTableMetaEditor } from './DecisionTableMetaEditor';
import { TestPanel } from './TestPanel';
import { DecisionTableEditor } from './DecisionTableEditor';
import { AIChat } from './AIChat';
import { AIGeneratedTable } from '@/services/aiService';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Sparkles, Edit3 } from 'lucide-react';

interface DecisionTableComponentProps {
  initialData?: DecisionTableFullData;
  onChange?: (data: DecisionTableFullData) => void;
  className?: string;
}

// 默认元信息
const getDefaultMeta = (): DecisionTableMeta => ({
  code: 'DT_001',
  name: '新决策表',
  description: '',
});

// 默认表格数据
const getDefaultTableData = (): { columns: Column[]; rules: Rule[] } => {
  const inputCol: Column = {
    id: generateId(),
    name: 'product_id',
    dataType: 'string',
    isInput: true,
    variableId: 'var_1',
  };
  
  const inputCol2: Column = {
    id: generateId(),
    name: 'score',
    dataType: 'integer',
    isInput: true,
    variableId: 'var_2',
  };
  
  const outputCol: Column = {
    id: generateId(),
    name: 'rate',
    dataType: 'decimal',
    isInput: false,
  };
  
  const columns = [inputCol, inputCol2, outputCol];
  
  const rules: Rule[] = [
    { id: generateId(), cells: { [inputCol.id]: 'sZ0101', [inputCol2.id]: '(596,+inf)', [outputCol.id]: '0.0150' } },
    { id: generateId(), cells: { [inputCol.id]: 'sZ0101', [inputCol2.id]: '(566,596]', [outputCol.id]: '0.0388' } },
    { id: generateId(), cells: { [inputCol.id]: 'sZ0101', [inputCol2.id]: '(541,566]', [outputCol.id]: '0.0444' } },
    { id: generateId(), cells: { [inputCol.id]: 'sZ0101', [inputCol2.id]: '(516,541]', [outputCol.id]: '0.0501' } },
    { id: generateId(), cells: { [inputCol.id]: 'sZ0101', [inputCol2.id]: '(0,516]', [outputCol.id]: '0.0542' } },
  ];
  
  return { columns, rules };
};

type EditorMode = 'ai' | 'manual';

export const DecisionTableComponent: React.FC<DecisionTableComponentProps> = ({
  initialData,
  onChange,
  className,
}) => {
  const [mode, setMode] = useState<EditorMode>('ai');
  const [meta, setMeta] = useState<DecisionTableMeta>(
    () => initialData?.meta || getDefaultMeta()
  );
  const [columns, setColumns] = useState<Column[]>(
    () => initialData?.columns || getDefaultTableData().columns
  );
  const [rules, setRules] = useState<Rule[]>(
    () => initialData?.rules || getDefaultTableData().rules
  );
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);

  // 触发 onChange
  useEffect(() => {
    onChange?.({ meta, columns, rules });
  }, [meta, columns, rules, onChange]);

  // 处理表格数据变化
  const handleTableChange = useCallback((data: { columns: Column[]; rules: Rule[] }) => {
    setColumns(data.columns);
    setRules(data.rules);
  }, []);

  // 应用 AI 生成的表格
  const handleApplyAITable = useCallback((table: AIGeneratedTable) => {
    setMeta(table.meta);
    setColumns(table.columns);
    setRules(table.rules);
    // 自动切换到手动模式以便查看和编辑
    setMode('manual');
  }, []);

  return (
    <div className={cn("flex flex-col h-full gap-3", className)}>
      {/* 顶部模式切换和基本信息 */}
      <div className="flex items-start gap-4">
        {/* 模式切换 */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as EditorMode)} className="flex-shrink-0">
          <TabsList className="h-9">
            <TabsTrigger value="ai" className="gap-1.5 px-3">
              <Sparkles className="w-3.5 h-3.5" />
              AI 模式
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5 px-3">
              <Edit3 className="w-3.5 h-3.5" />
              手动模式
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* 基本信息编辑器（仅在手动模式显示完整编辑） */}
        <div className="flex-1">
          <DecisionTableMetaEditor
            meta={meta}
            onChange={setMeta}
            compact={mode === 'ai'}
          />
        </div>
      </div>
      
      {/* 主体区域 */}
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card">
        {mode === 'ai' ? (
          // AI 模式：左侧对话 + 右侧预览
          <ResizablePanelGroup direction="horizontal">
            {/* 左侧 AI 对话 */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <AIChat
                onApplyTable={handleApplyAITable}
                className="h-full"
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            {/* 右侧决策表预览 */}
            <ResizablePanel defaultSize={65} minSize={50}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={75} minSize={50}>
                  <DecisionTableEditor
                    initialData={{ columns, rules }}
                    onChange={handleTableChange}
                    highlightedRuleId={highlightedRuleId}
                    className="h-full border-0 rounded-none"
                  />
                </ResizablePanel>
                
                <ResizableHandle withHandle />
                
                <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                  <TestPanel
                    columns={columns}
                    rules={rules}
                    onHighlightRule={setHighlightedRuleId}
                    className="h-full border-l-0"
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          // 手动模式：左侧编辑器 + 右侧测试面板
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={75} minSize={50}>
              <DecisionTableEditor
                initialData={{ columns, rules }}
                onChange={handleTableChange}
                highlightedRuleId={highlightedRuleId}
                className="h-full border-0 rounded-none"
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <TestPanel
                columns={columns}
                rules={rules}
                onHighlightRule={setHighlightedRuleId}
                className="h-full border-l-0"
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};
