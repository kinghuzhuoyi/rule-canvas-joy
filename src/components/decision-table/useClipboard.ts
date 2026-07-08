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
  copySelectedCells: () => Promise<boolean>;
  pasteFromClipboard: () => Promise<boolean>;
  pasteText: (text: string) => void;
  deleteSelectedCells: () => void;
  exportToMarkdown: () => string;
  importFromExcel: (text: string) => void;
  copyText: (text: string) => Promise<boolean>;
}

export const useClipboard = ({
  columns,
  rules,
  setRules,
  getSelectedRange,
  clearSelection,
}: UseClipboardProps): UseClipboardReturn => {
  
  const copyText = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      throw new Error('clipboard api unavailable');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }, []);

  const copySelectedCells = useCallback(async (): Promise<boolean> => {
    const range = getSelectedRange();
    if (!range) return false;

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

    return copyText(lines.join('\n'));
  }, [columns, rules, getSelectedRange, copyText]);

  const pasteText = useCallback((text: string) => {
    const range = getSelectedRange();
    if (!range) return;

    const lines = text.split(/\r?\n/).filter(line => line.length > 0);
    if (lines.length === 0) return;

    const { startRuleIndex, startColumnIndex } = range;

    setRules(prevRules => {
      const newRules = [...prevRules];

      lines.forEach((line, lineIdx) => {
        const ruleIdx = startRuleIndex + lineIdx;
        const values = line.split('\t');

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
            newRules[ruleIdx] = {
              ...newRules[ruleIdx],
              cells: {
                ...newRules[ruleIdx].cells,
                [columnId]: value.trim(),
              },
            };
          }
        });
      });

      return newRules;
    });
  }, [columns, setRules, getSelectedRange]);

  const pasteFromClipboard = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        return false;
      }
      const text = await navigator.clipboard.readText();
      if (!text) return false;
      pasteText(text);
      return true;
    } catch (err) {
      console.warn('clipboard readText blocked, fallback to paste event', err);
      return false;
    }
  }, [pasteText]);

  
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
