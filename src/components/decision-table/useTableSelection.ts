import { useState, useCallback, useRef, useEffect } from 'react';
import { SelectedCell, SelectionRange, Column, Rule } from './types';

interface UseTableSelectionProps {
  columns: Column[];
  rules: Rule[];
}

interface UseTableSelectionReturn {
  selectedCells: Set<string>;
  selectionStart: SelectedCell | null;
  isSelecting: boolean;
  handleCellMouseDown: (ruleId: string, columnId: string, e: React.MouseEvent) => void;
  handleCellMouseEnter: (ruleId: string, columnId: string) => void;
  handleMouseUp: () => void;
  clearSelection: () => void;
  selectAll: () => void;
  getSelectedRange: () => SelectionRange | null;
  isCellSelected: (ruleId: string, columnId: string) => boolean;
}

export const useTableSelection = ({ columns, rules }: UseTableSelectionProps): UseTableSelectionReturn => {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<SelectedCell | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<SelectedCell | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  
  const getCellKey = (ruleId: string, columnId: string) => `${ruleId}:${columnId}`;
  
  const getColumnIndex = useCallback((columnId: string) => {
    return columns.findIndex(c => c.id === columnId);
  }, [columns]);
  
  const getRuleIndex = useCallback((ruleId: string) => {
    return rules.findIndex(r => r.id === ruleId);
  }, [rules]);
  
  const calculateSelectedCells = useCallback((start: SelectedCell, end: SelectedCell): Set<string> => {
    const startColIdx = getColumnIndex(start.columnId);
    const endColIdx = getColumnIndex(end.columnId);
    const startRuleIdx = getRuleIndex(start.ruleId);
    const endRuleIdx = getRuleIndex(end.ruleId);
    
    const minCol = Math.min(startColIdx, endColIdx);
    const maxCol = Math.max(startColIdx, endColIdx);
    const minRule = Math.min(startRuleIdx, endRuleIdx);
    const maxRule = Math.max(startRuleIdx, endRuleIdx);
    
    const selected = new Set<string>();
    
    for (let r = minRule; r <= maxRule; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (rules[r] && columns[c]) {
          selected.add(getCellKey(rules[r].id, columns[c].id));
        }
      }
    }
    
    return selected;
  }, [columns, rules, getColumnIndex, getRuleIndex]);
  
  const handleCellMouseDown = useCallback((ruleId: string, columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const cell = { ruleId, columnId };
    setSelectionStart(cell);
    setSelectionEnd(cell);
    setIsSelecting(true);
    setSelectedCells(new Set([getCellKey(ruleId, columnId)]));
  }, []);
  
  const handleCellMouseEnter = useCallback((ruleId: string, columnId: string) => {
    if (!isSelecting || !selectionStart) return;
    
    const cell = { ruleId, columnId };
    setSelectionEnd(cell);
    setSelectedCells(calculateSelectedCells(selectionStart, cell));
  }, [isSelecting, selectionStart, calculateSelectedCells]);
  
  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedCells(new Set());
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);
  
  const selectAll = useCallback(() => {
    const allCells = new Set<string>();
    rules.forEach(rule => {
      columns.forEach(col => {
        allCells.add(getCellKey(rule.id, col.id));
      });
    });
    setSelectedCells(allCells);
  }, [rules, columns]);
  
  const getSelectedRange = useCallback((): SelectionRange | null => {
    if (!selectionStart || !selectionEnd) return null;
    
    const startColIdx = getColumnIndex(selectionStart.columnId);
    const endColIdx = getColumnIndex(selectionEnd.columnId);
    const startRuleIdx = getRuleIndex(selectionStart.ruleId);
    const endRuleIdx = getRuleIndex(selectionEnd.ruleId);
    
    return {
      startRuleIndex: Math.min(startRuleIdx, endRuleIdx),
      endRuleIndex: Math.max(startRuleIdx, endRuleIdx),
      startColumnIndex: Math.min(startColIdx, endColIdx),
      endColumnIndex: Math.max(startColIdx, endColIdx),
    };
  }, [selectionStart, selectionEnd, getColumnIndex, getRuleIndex]);
  
  const isCellSelected = useCallback((ruleId: string, columnId: string) => {
    return selectedCells.has(getCellKey(ruleId, columnId));
  }, [selectedCells]);
  
  // 全局鼠标松开事件
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting]);
  
  return {
    selectedCells,
    selectionStart,
    isSelecting,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleMouseUp,
    clearSelection,
    selectAll,
    getSelectedRange,
    isCellSelected,
  };
};
