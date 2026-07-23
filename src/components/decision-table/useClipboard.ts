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
      // 拆分普通行与兜底行，粘贴仅作用于普通行，超出部分自动新增到兜底行之前
      const normalRules = prevRules.filter(r => !r.isFallback);
      const fallbackRules = prevRules.filter(r => r.isFallback);

      // 计算相对于普通行的起始索引
      // startRuleIndex 是原数组索引，需换算：若起点落在兜底行，则改到最后一条普通行之后（追加新行）
      let normalStart = startRuleIndex;
      const originalRule = prevRules[startRuleIndex];
      if (originalRule?.isFallback) {
        normalStart = normalRules.length;
      } else if (originalRule) {
        normalStart = normalRules.findIndex(r => r.id === originalRule.id);
        if (normalStart < 0) normalStart = normalRules.length;
      }

      const newNormal = [...normalRules];

      lines.forEach((line, lineIdx) => {
        const ruleIdx = normalStart + lineIdx;
        const values = line.split('\t');

        while (ruleIdx >= newNormal.length) {
          const newRule: Rule = {
            id: generateId(),
            cells: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
          };
          newNormal.push(newRule);
        }

        values.forEach((value, colIdx) => {
          const columnIdx = startColumnIndex + colIdx;
          if (columnIdx < columns.length) {
            const columnId = columns[columnIdx].id;
            newNormal[ruleIdx] = {
              ...newNormal[ruleIdx],
              cells: {
                ...newNormal[ruleIdx].cells,
                [columnId]: value.trim(),
              },
            };
          }
        });
      });

      return [...newNormal, ...fallbackRules];
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
    pasteText,
    deleteSelectedCells,
    exportToMarkdown,
    importFromExcel,
    copyText,
  };
};
