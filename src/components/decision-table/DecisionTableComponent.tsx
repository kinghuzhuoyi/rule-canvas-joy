import React, { useState, useCallback, useEffect } from 'react';
import { DecisionTableMeta, DecisionTableFullData, Column, Rule, generateId } from './types';
import { DecisionTableMetaEditor } from './DecisionTableMetaEditor';
import { TestPanel } from './TestPanel';
import { DecisionTableEditor } from './DecisionTableEditor';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

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

export const DecisionTableComponent: React.FC<DecisionTableComponentProps> = ({
  initialData,
  onChange,
  className,
}) => {
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

  return (
    <div className={cn("flex flex-col h-full gap-3", className)}>
      {/* 顶部基本信息 */}
      <DecisionTableMetaEditor
        meta={meta}
        onChange={setMeta}
      />
      
      {/* 主体区域：左侧编辑器 + 右侧测试面板 */}
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <ResizablePanelGroup direction="horizontal">
          {/* 左侧决策表编辑器 */}
          <ResizablePanel defaultSize={75} minSize={50}>
            <DecisionTableEditor
              initialData={{ columns, rules }}
              onChange={handleTableChange}
              highlightedRuleId={highlightedRuleId}
              className="h-full border-0 rounded-none"
            />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* 右侧测试面板 */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <TestPanel
              columns={columns}
              rules={rules}
              onHighlightRule={setHighlightedRuleId}
              className="h-full border-l-0"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
