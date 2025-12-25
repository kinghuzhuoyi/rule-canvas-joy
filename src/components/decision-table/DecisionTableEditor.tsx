import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, Copy, ClipboardPaste, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Column, Rule, Variable, DataType, generateId } from './types';
import { TableHeader } from './TableHeader';
import { RuleRow } from './RuleRow';
import { useTableSelection } from './useTableSelection';
import { useClipboard } from './useClipboard';
import { cn } from '@/lib/utils';

interface DecisionTableEditorProps {
  className?: string;
  initialData?: { columns: Column[]; rules: Rule[] };
  onChange?: (data: { columns: Column[]; rules: Rule[] }) => void;
}

// 默认初始数据
const getDefaultData = (): { columns: Column[]; rules: Rule[] } => {
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

export const DecisionTableEditor: React.FC<DecisionTableEditorProps> = ({
  className,
  initialData,
  onChange,
}) => {
  const { toast } = useToast();
  const [columns, setColumns] = useState<Column[]>(() => initialData?.columns || getDefaultData().columns);
  const [rules, setRules] = useState<Rule[]>(() => initialData?.rules || getDefaultData().rules);
  
  const {
    selectedCells,
    isCellSelected,
    handleCellMouseDown,
    handleCellMouseEnter,
    clearSelection,
    getSelectedRange,
  } = useTableSelection({ columns, rules });
  
  const {
    copySelectedCells,
    pasteFromClipboard,
    deleteSelectedCells,
    exportToMarkdown,
    importFromExcel,
  } = useClipboard({
    columns,
    rules,
    setRules,
    getSelectedRange,
    clearSelection,
  });
  
  // 触发 onChange
  useEffect(() => {
    onChange?.({ columns, rules });
  }, [columns, rules, onChange]);
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCells.size === 0) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedCells();
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
          e.preventDefault();
          copySelectedCells();
          toast({ description: '已复制到剪贴板' });
        } else if (e.key === 'v') {
          e.preventDefault();
          pasteFromClipboard();
        } else if (e.key === 'a') {
          e.preventDefault();
          // selectAll handled by useTableSelection
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCells, copySelectedCells, pasteFromClipboard, deleteSelectedCells, toast]);
  
  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setRules(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  // 添加输入列 - 支持 insertIndex
  const handleAddInputColumn = useCallback((variable: Variable, insertIndex?: number) => {
    const newColumn: Column = {
      id: generateId(),
      name: variable.name,
      dataType: variable.dataType,
      isInput: true,
      variableId: variable.id,
    };
    
    setColumns(prev => {
      const inputCols = prev.filter(c => c.isInput);
      const outputCols = prev.filter(c => !c.isInput);
      
      const idx = insertIndex ?? inputCols.length;
      inputCols.splice(idx, 0, newColumn);
      
      return [...inputCols, ...outputCols];
    });
    
    // 为所有规则添加新列的单元格
    setRules(prev => prev.map(rule => ({
      ...rule,
      cells: { ...rule.cells, [newColumn.id]: '' },
    })));
  }, []);
  
  // 添加输出列 - 支持 insertIndex
  const handleAddOutputColumn = useCallback((name: string, dataType: DataType, insertIndex?: number) => {
    const newColumn: Column = {
      id: generateId(),
      name,
      dataType,
      isInput: false,
    };
    
    setColumns(prev => {
      const inputCols = prev.filter(c => c.isInput);
      const outputCols = prev.filter(c => !c.isInput);
      
      const idx = insertIndex ?? outputCols.length;
      outputCols.splice(idx, 0, newColumn);
      
      return [...inputCols, ...outputCols];
    });
    
    // 为所有规则添加新列的单元格
    setRules(prev => prev.map(rule => ({
      ...rule,
      cells: { ...rule.cells, [newColumn.id]: '' },
    })));
  }, []);
  
  // 编辑列
  const handleEditColumn = useCallback((columnId: string, name: string, dataType: DataType) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId ? { ...col, name, dataType } : col
    ));
  }, []);
  
  // 删除列
  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
    setRules(prev => prev.map(rule => {
      const { [columnId]: _, ...restCells } = rule.cells;
      return { ...rule, cells: restCells };
    }));
  }, []);
  
  // 添加规则行
  const handleAddRule = useCallback(() => {
    const newRule: Rule = {
      id: generateId(),
      cells: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
    };
    setRules(prev => [...prev, newRule]);
  }, [columns]);
  
  // 删除规则行
  const handleDeleteRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);
  
  // 修改单元格值
  const handleCellChange = useCallback((ruleId: string, columnId: string, value: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === ruleId
        ? { ...rule, cells: { ...rule.cells, [columnId]: value } }
        : rule
    ));
  }, []);
  
  // 复制为 Markdown
  const handleExportMarkdown = () => {
    const markdown = exportToMarkdown();
    navigator.clipboard.writeText(markdown);
    toast({ description: '已复制 Markdown 到剪贴板' });
  };
  
  // 从 Excel 粘贴
  const handleImportFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      importFromExcel(text);
      toast({ description: '已从剪贴板导入数据' });
    } catch {
      toast({ variant: 'destructive', description: '读取剪贴板失败' });
    }
  };

  const inputColumnCount = columns.filter(c => c.isInput).length;
  const outputColumnCount = columns.filter(c => !c.isInput).length;
  
  return (
    <div className={cn("flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden", className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
        <h3 className="font-semibold text-foreground">决策表编辑器</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={copySelectedCells}>
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">复制</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={pasteFromClipboard}>
            <ClipboardPaste className="h-4 w-4" />
            <span className="hidden sm:inline">粘贴</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportMarkdown}>
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">导出 Markdown</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleImportFromClipboard}>
            <ClipboardPaste className="h-4 w-4" />
            <span className="hidden sm:inline">从 Excel 导入</span>
          </Button>
        </div>
      </div>
      
      {/* 表格区域 */}
      <div className="flex-1 overflow-auto" onClick={e => {
        if (e.target === e.currentTarget) clearSelection();
      }}>
        {/* 区域标签（随横向滚动联动，纵向固定） */}
        <div className="sticky top-0 z-30 flex border-b border-border min-w-max bg-card h-8">
          {/* 左侧占位 - sticky */}
          <div className="w-8 flex-shrink-0 sticky left-0 z-10 bg-card" />
          <div
            className="h-full flex items-center justify-center px-3 bg-secondary/30 text-center text-xs font-medium text-muted-foreground flex-shrink-0"
            style={{ width: `${inputColumnCount * 140}px` }}
          >
            输入条件
          </div>
          <div className="w-1 bg-border flex-shrink-0" />
          <div
            className="h-full flex items-center justify-center px-3 bg-primary/5 text-center text-xs font-medium text-muted-foreground flex-shrink-0"
            style={{ width: `${outputColumnCount * 140}px` }}
          >
            输出结果
          </div>
          {/* 右侧占位 - sticky */}
          <div className="w-10 flex-shrink-0 sticky right-0 z-10 bg-card" />
        </div>

        {/* 表头 */}
        <TableHeader
          columns={columns}
          onAddInputColumn={handleAddInputColumn}
          onAddOutputColumn={handleAddOutputColumn}
          onEditColumn={handleEditColumn}
          onDeleteColumn={handleDeleteColumn}
        />
        
        {/* 规则行 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
            <div className="min-w-max">
              {rules.map(rule => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  columns={columns}
                  onCellChange={handleCellChange}
                  onDelete={handleDeleteRule}
                  isCellSelected={isCellSelected}
                  onCellMouseDown={handleCellMouseDown}
                  onCellMouseEnter={handleCellMouseEnter}
                  canDelete={rules.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      
      {/* 添加规则按钮 */}
      <div className="flex justify-center py-3 border-t border-border bg-muted/30">
        <Button variant="outline" size="sm" className="gap-1" onClick={handleAddRule}>
          <Plus className="h-4 w-4" />
          添加条件行
        </Button>
      </div>
    </div>
  );
};

export default DecisionTableEditor;