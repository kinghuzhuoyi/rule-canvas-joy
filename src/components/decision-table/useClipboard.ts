import { useCallback } from 'react';
import { Column, Rule, SelectionRange, DecisionTableData, generateId } from './types';

interface UseClipboardProps {
  columns: Column[];
  rules: Rule[];
  setRules: React.Dispatch<React.SetStateAction<Rule[]>>;
  getSelectedRange: () => SelectionRange | null;
  clearSelection: () => void;
}

interface UseClipboardReturn {
  copySelectedCells: () => void;
  pasteFromClipboard: () => Promise<void>;
  deleteSelectedCells: () => void;
  exportToMarkdown: () => string;
  importFromExcel: (text: string) => void;
}

export const useClipboard = ({
  columns,
  rules,
  setRules,
  getSelectedRange,
  clearSelection,
}: UseClipboardProps): UseClipboardReturn => {
  
  const copySelectedCells = useCallback(() => {
    const range = getSelectedRange();
    if (!range) return;
    
    const { startRuleIndex, endRuleIndex, startColumnIndex, endColumnIndex } = range;
    
    const lines: string[] = [];
    for (let r = startRuleIndex; r <= endRuleIndex; r++) {
      const row: string[] = [];
      for (let c = startColumnIndex; c <= endColumnIndex; c++) {
        const columnId = columns[c]?.id;
        const value = rules[r]?.cells[columnId] || '';
        row.push(value);
      }
      lines.push(row.join('\t'));
    }
    
    navigator.clipboard.writeText(lines.join('\n'));
  }, [columns, rules, getSelectedRange]);
  
  const pasteFromClipboard = useCallback(async () => {
    const range = getSelectedRange();
    if (!range) return;
    
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) return;
      
      const { startRuleIndex, startColumnIndex } = range;
      
      setRules(prevRules => {
        const newRules = [...prevRules];
        
        lines.forEach((line, lineIdx) => {
          const ruleIdx = startRuleIndex + lineIdx;
          const values = line.split('\t');
          
          // 如果需要新增行
          if (ruleIdx >= newRules.length) {
            const newRule: Rule = {
              id: generateId(),
              cells: {},
            };
            columns.forEach(col => {
              newRule.cells[col.id] = '';
            });
            newRules.push(newRule);
          }
          
          values.forEach((value, colIdx) => {
            const columnIdx = startColumnIndex + colIdx;
            if (columnIdx < columns.length) {
              const columnId = columns[columnIdx].id;
              newRules[ruleIdx].cells[columnId] = value.trim();
            }
          });
        });
        
        return newRules;
      });
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  }, [columns, setRules, getSelectedRange]);
  
  const deleteSelectedCells = useCallback(() => {
    const range = getSelectedRange();
    if (!range) return;
    
    const { startRuleIndex, endRuleIndex, startColumnIndex, endColumnIndex } = range;
    
    setRules(prevRules => {
      const newRules = [...prevRules];
      
      for (let r = startRuleIndex; r <= endRuleIndex; r++) {
        for (let c = startColumnIndex; c <= endColumnIndex; c++) {
          const columnId = columns[c]?.id;
          if (columnId && newRules[r]) {
            newRules[r] = {
              ...newRules[r],
              cells: {
                ...newRules[r].cells,
                [columnId]: '',
              },
            };
          }
        }
      }
      
      return newRules;
    });
    
    clearSelection();
  }, [columns, setRules, getSelectedRange, clearSelection]);
  
  const exportToMarkdown = useCallback((): string => {
    const inputColumns = columns.filter(c => c.isInput);
    const outputColumns = columns.filter(c => !c.isInput);
    const allColumns = [...inputColumns, ...outputColumns];
    
    // 表头
    const headerRow = '| ' + allColumns.map(c => c.name).join(' | ') + ' |';
    const separatorRow = '| ' + allColumns.map(() => '---').join(' | ') + ' |';
    
    // 数据行
    const dataRows = rules.map(rule => {
      return '| ' + allColumns.map(col => rule.cells[col.id] || '').join(' | ') + ' |';
    });
    
    return [headerRow, separatorRow, ...dataRows].join('\n');
  }, [columns, rules]);
  
  const importFromExcel = useCallback((text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;
    
    // 假设第一行是表头，跳过
    const dataLines = lines.slice(1);
    
    setRules(prevRules => {
      const newRules: Rule[] = [];
      
      dataLines.forEach(line => {
        const values = line.split('\t');
        const newRule: Rule = {
          id: generateId(),
          cells: {},
        };
        
        columns.forEach((col, idx) => {
          newRule.cells[col.id] = values[idx]?.trim() || '';
        });
        
        newRules.push(newRule);
      });
      
      return newRules.length > 0 ? newRules : prevRules;
    });
  }, [columns, setRules]);
  
  return {
    copySelectedCells,
    pasteFromClipboard,
    deleteSelectedCells,
    exportToMarkdown,
    importFromExcel,
  };
};
