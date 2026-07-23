import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { Plus, Copy, ClipboardPaste, FileText, Shield, Pencil, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Column, Rule, InputExpr, DataType, generateId, expressionToString, inferExprDataType } from './types';
import { TableHeader } from './TableHeader';
import { RuleRow } from './RuleRow';
import { useTableSelection } from './useTableSelection';
import { useClipboard } from './useClipboard';
import { cn } from '@/lib/utils';

interface DecisionTableEditorProps {
  className?: string;
  initialData?: { columns: Column[]; rules: Rule[] };
  onChange?: (data: { columns: Column[]; rules: Rule[] }) => void;
  highlightedRuleId?: string | null;
  defaultMode?: 'view' | 'edit';
}

// 默认初始数据（空表：由用户点击 + 添加列和行）
const getDefaultData = (): { columns: Column[]; rules: Rule[] } => ({
  columns: [],
  rules: [],
});

export const DecisionTableEditor: React.FC<DecisionTableEditorProps> = ({
  className,
  initialData,
  onChange,
  highlightedRuleId,
  defaultMode = 'view',
}) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<'view' | 'edit'>(defaultMode);
  const readOnly = mode === 'view';
  const [columns, setColumns] = useState<Column[]>(() => initialData?.columns || getDefaultData().columns);
  const [rules, setRules] = useState<Rule[]>(() => initialData?.rules || getDefaultData().rules);
  
  // 用于深度比较的 ref
  const prevColumnsRef = useRef<string>(JSON.stringify(initialData?.columns || []));
  const prevRulesRef = useRef<string>(JSON.stringify(initialData?.rules || []));
  // 标记是否正在从外部同步，避免循环触发 onChange
  const isSyncingFromParent = useRef(false);
  
  // 同步外部数据变化
  useEffect(() => {
    const columnsStr = JSON.stringify(initialData?.columns);
    if (initialData?.columns && columnsStr !== prevColumnsRef.current) {
      prevColumnsRef.current = columnsStr;
      isSyncingFromParent.current = true;
      setColumns(initialData.columns);
    }
  }, [initialData?.columns]);

  useEffect(() => {
    const rulesStr = JSON.stringify(initialData?.rules);
    if (initialData?.rules && rulesStr !== prevRulesRef.current) {
      prevRulesRef.current = rulesStr;
      isSyncingFromParent.current = true;
      setRules(initialData.rules);
    }
  }, [initialData?.rules]);

  // 确保始终存在一个兜底行
  useEffect(() => {
    if (!rules.some(r => r.isFallback)) {
      setRules(prev => [
        ...prev,
        {
          id: generateId(),
          isFallback: true,
          cells: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
        },
      ]);
    }
  }, [rules, columns]);
  

  
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
    pasteText,
    deleteSelectedCells,
    exportToMarkdown,
    importFromExcel,
    copyText,
  } = useClipboard({
    columns,
    rules,
    setRules,
    getSelectedRange,
    clearSelection,
  });
  
  // 触发 onChange（仅当本地编辑时，跳过从父组件同步的情况）
  useEffect(() => {
    if (isSyncingFromParent.current) {
      isSyncingFromParent.current = false;
      return;
    }
    prevColumnsRef.current = JSON.stringify(columns);
    prevRulesRef.current = JSON.stringify(rules);
    onChange?.({ columns, rules });
  }, [columns, rules, onChange]);
  
  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;
      if (selectedCells.size === 0) return;

      const target = e.target as HTMLElement | null;
      const inEditable = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      // 多单元格选中时，即便焦点在 Input 也要接管，避免只复制单个输入框
      const multi = selectedCells.size > 1;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (inEditable && !multi) return;
        e.preventDefault();
        deleteSelectedCells();
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
          if (inEditable && !multi) return;
          e.preventDefault();
          copySelectedCells().then(ok => {
            toast({
              description: ok ? '已复制到剪贴板' : '复制失败，请检查浏览器权限',
              variant: ok ? undefined : 'destructive',
            });
          });
        }
        // Ctrl+V 交给原生 paste 事件
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (selectedCells.size === 0) return;
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;

      const isMultiCellContent = /\t|\r?\n/.test(text.replace(/\r?\n$/, ''));
      const target = e.target as HTMLElement | null;
      const inEditable = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      const multi = selectedCells.size > 1;

      // 单选 + 单格内容 + 焦点在输入框：交给原生粘贴
      if (inEditable && !multi && !isMultiCellContent) return;

      e.preventDefault();
      pasteText(text);
      toast({ description: '已粘贴数据' });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [selectedCells, copySelectedCells, pasteText, deleteSelectedCells, toast]);
  
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
  const handleAddInputColumn = useCallback((expr: InputExpr, insertIndex?: number) => {
    const newColumn: Column = {
      id: generateId(),
      name: expressionToString(expr),
      dataType: inferExprDataType(expr),
      isInput: true,
      inputExpr: expr,
      variableId: expr.kind === 'variable' ? expr.variableId : undefined,
    };
    
    setColumns(prev => {
      const inputCols = prev.filter(c => c.isInput);
      const outputCols = prev.filter(c => !c.isInput);
      
      const idx = insertIndex ?? inputCols.length;
      inputCols.splice(idx, 0, newColumn);
      
      return [...inputCols, ...outputCols];
    });
    
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
    
    setRules(prev => prev.map(rule => ({
      ...rule,
      cells: { ...rule.cells, [newColumn.id]: '' },
    })));
  }, []);
  
  // 编辑列
  const handleEditColumn = useCallback((columnId: string, name: string, dataType: DataType, inputExpr?: InputExpr) => {
    setColumns(prev => prev.map(col =>
      col.id === columnId
        ? {
            ...col,
            name,
            dataType,
            ...(inputExpr !== undefined ? { inputExpr, variableId: inputExpr.kind === 'variable' ? inputExpr.variableId : undefined } : {}),
          }
        : col
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
  const handleExportMarkdown = async () => {
    const markdown = exportToMarkdown();
    const ok = await copyText(markdown);
    toast({
      description: ok ? '已复制 Markdown 到剪贴板' : '复制失败，请检查浏览器权限',
      variant: ok ? undefined : 'destructive',
    });
  };

  const handleCopyClick = async () => {
    if (selectedCells.size === 0) {
      toast({ variant: 'destructive', description: '请先选中要复制的单元格' });
      return;
    }
    const ok = await copySelectedCells();
    toast({
      description: ok ? '已复制到剪贴板' : '复制失败，请检查浏览器权限',
      variant: ok ? undefined : 'destructive',
    });
  };

  const handlePasteClick = async () => {
    if (selectedCells.size === 0) {
      toast({ variant: 'destructive', description: '请先选中起始单元格' });
      return;
    }
    const ok = await pasteFromClipboard();
    if (ok) {
      toast({ description: '已粘贴数据' });
    } else {
      toast({ description: '当前环境无法直接读取剪贴板，请按 Ctrl/⌘ + V 粘贴' });
    }
  };

  // 从 Excel 粘贴
  const handleImportFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) throw new Error('unavailable');
      const text = await navigator.clipboard.readText();
      importFromExcel(text);
      toast({ description: '已从剪贴板导入数据' });
    } catch {
      toast({ description: '当前环境无法直接读取剪贴板，请聚焦表格后按 Ctrl/⌘ + V 粘贴' });
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
          <Button variant="outline" size="sm" className="gap-1" onClick={handleCopyClick}>
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">复制</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handlePasteClick}>
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
            style={{ width: `${Math.max(inputColumnCount, 1) * 140}px` }}
          >
            输入条件
          </div>
          <div className="w-1 bg-border flex-shrink-0" />
          <div
            className="h-full flex items-center justify-center px-3 bg-primary/5 text-center text-xs font-medium text-muted-foreground flex-shrink-0"
            style={{ width: `${Math.max(outputColumnCount, 1) * 140}px` }}
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
          {(() => {
            const normalRules = rules.filter(r => !r.isFallback);
            const fallbackRule = rules.find(r => r.isFallback);
            return (
              <SortableContext items={normalRules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                <div className="min-w-max">
                  {normalRules.map(rule => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      columns={columns}
                      onCellChange={handleCellChange}
                      onDelete={handleDeleteRule}
                      isCellSelected={isCellSelected}
                      onCellMouseDown={handleCellMouseDown}
                      onCellMouseEnter={handleCellMouseEnter}
                      canDelete={normalRules.length > 1}
                      isHighlighted={highlightedRuleId === rule.id}
                    />
                  ))}
                  {fallbackRule && (
                    <RuleRow
                      key={fallbackRule.id}
                      rule={fallbackRule}
                      columns={columns}
                      onCellChange={handleCellChange}
                      onDelete={handleDeleteRule}
                      isCellSelected={isCellSelected}
                      onCellMouseDown={handleCellMouseDown}
                      onCellMouseEnter={handleCellMouseEnter}
                      canDelete={false}
                      isHighlighted={highlightedRuleId === fallbackRule.id}
                      isFallback
                    />
                  )}
                </div>
              </SortableContext>
            );
          })()}
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