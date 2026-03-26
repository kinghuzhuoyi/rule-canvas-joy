import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { 
  DecisionTableMeta, 
  Column, 
  Rule, 
  TestCase, 
  generateId 
} from '@/components/decision-table/types';
import { supabase } from '@/integrations/supabase/client';

// 单个决策表状态
export interface DecisionTableState {
  id: string;
  meta: DecisionTableMeta;
  columns: Column[];
  rules: Rule[];
  notes: string;
  testCases: TestCase[];
}

// Context 值类型
interface DecisionTableContextValue {
  tables: DecisionTableState[];
  activeTableId: string | null;
  activeTable: DecisionTableState | null;
  
  // 操作方法
  createTable: (data?: Partial<Omit<DecisionTableState, 'id'>>) => string;
  updateTable: (id: string, updates: Partial<Omit<DecisionTableState, 'id'>>) => void;
  deleteTable: (id: string) => void;
  setActiveTable: (id: string | null) => void;
  
  // AI 辅助方法
  getTableSummary: () => string;
  getTableById: (id: string) => DecisionTableState | undefined;
}

const DecisionTableContext = createContext<DecisionTableContextValue | null>(null);

// 生成默认元信息
const getDefaultMeta = (index: number): DecisionTableMeta => ({
  code: `DT_${String(index).padStart(3, '0')}`,
  name: `决策表 ${index}`,
  description: '',
});

// 生成默认列
const getDefaultColumns = (): Column[] => [
  { id: generateId(), name: 'input_1', dataType: 'string', isInput: true, variableId: 'var_1' },
  { id: generateId(), name: 'output_1', dataType: 'string', isInput: false },
];

// 生成默认规则
const getDefaultRules = (columns: Column[]): Rule[] => [{
  id: generateId(),
  cells: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
}];

// Provider Props
interface DecisionTableProviderProps {
  children: ReactNode;
}

export function DecisionTableProvider({ children }: DecisionTableProviderProps) {
  const [tables, setTables] = useState<DecisionTableState[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 从数据库加载决策表
  useEffect(() => {
    (async () => {
      try {
        const { data: dbTables } = await supabase
          .from('decision_tables')
          .select('*')
          .order('created_at', { ascending: true });

        if (dbTables && dbTables.length > 0) {
          // 加载测试用例
          const tableIds = dbTables.map(t => t.id);
          const { data: dbCases } = await supabase
            .from('decision_table_test_cases')
            .select('*')
            .in('table_id', tableIds);

          const casesMap = new Map<string, TestCase[]>();
          (dbCases || []).forEach(c => {
            const list = casesMap.get(c.table_id) || [];
            list.push({
              id: c.id,
              name: c.name || '',
              inputs: c.inputs as Record<string, string>,
              expectedOutputs: c.expected_outputs as Record<string, string>,
            });
            casesMap.set(c.table_id, list);
          });

          const loadedTables: DecisionTableState[] = dbTables.map(t => ({
            id: t.id,
            meta: {
              code: t.code,
              name: t.name,
              description: t.description || '',
            },
            columns: (t.columns as unknown as Column[]) || [],
            rules: (t.rules as unknown as Rule[]) || [],
            notes: t.notes || '',
            testCases: casesMap.get(t.id) || [],
          }));

          setTables(loadedTables);
          setActiveTableId(loadedTables[0].id);
        } else {
          // 无数据库记录时创建默认表
          const initialColumns = getDefaultColumns();
          const initialRules = getDefaultRules(initialColumns);
          const defaultTable: DecisionTableState = {
            id: generateId(),
            meta: getDefaultMeta(1),
            columns: initialColumns,
            rules: initialRules,
            notes: '',
            testCases: [],
          };
          setTables([defaultTable]);
          setActiveTableId(defaultTable.id);
        }
      } catch (e) {
        console.error('Failed to load decision tables:', e);
        // 出错时也创建默认表
        const initialColumns = getDefaultColumns();
        const initialRules = getDefaultRules(initialColumns);
        const defaultTable: DecisionTableState = {
          id: generateId(),
          meta: getDefaultMeta(1),
          columns: initialColumns,
          rules: initialRules,
          notes: '',
          testCases: [],
        };
        setTables([defaultTable]);
        setActiveTableId(defaultTable.id);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // 获取当前活动表
  const activeTable = tables.find(t => t.id === activeTableId) || null;

  // 创建新表 - 使用 setState 回调获取最新长度，避免依赖 tables.length
  const createTable = useCallback((data?: Partial<Omit<DecisionTableState, 'id'>>): string => {
    const newId = generateId();
    const newColumns = data?.columns || getDefaultColumns();
    const newRules = data?.rules || getDefaultRules(newColumns);
    
    setTables(prev => {
      const newTable: DecisionTableState = {
        id: newId,
        meta: data?.meta || getDefaultMeta(prev.length + 1),
        columns: newColumns,
        rules: newRules,
        notes: data?.notes || '',
        testCases: data?.testCases || [],
      };
      return [...prev, newTable];
    });
    
    setActiveTableId(newId);
    
    return newId;
  }, []);

  // 更新表
  const updateTable = useCallback((id: string, updates: Partial<Omit<DecisionTableState, 'id'>>) => {
    setTables(prev => prev.map(table => 
      table.id === id ? { ...table, ...updates } : table
    ));
  }, []);

  // 删除表
  const deleteTable = useCallback((id: string) => {
    setTables(prev => {
      const newTables = prev.filter(t => t.id !== id);
      
      // 如果删除的是当前活动表，切换到其他表
      if (activeTableId === id) {
        const deletedIndex = prev.findIndex(t => t.id === id);
        const newActiveIndex = Math.min(deletedIndex, newTables.length - 1);
        setActiveTableId(newTables[newActiveIndex]?.id || null);
      }
      
      return newTables;
    });
  }, [activeTableId]);

  // 设置活动表
  const setActiveTable = useCallback((id: string | null) => {
    if (id === null || tables.some(t => t.id === id)) {
      setActiveTableId(id);
    }
  }, [tables]);

  // 获取表摘要（供 AI 上下文使用）
  const getTableSummary = useCallback((): string => {
    if (tables.length === 0) {
      return '当前工作区没有决策表。';
    }
    
    const tableList = tables.map((t, i) => {
      const inputCount = t.columns.filter(c => c.isInput).length;
      const outputCount = t.columns.filter(c => !c.isInput).length;
      const isActive = t.id === activeTableId;
      return `${i + 1}. ${t.meta.code} - ${t.meta.name}（${inputCount}个输入，${outputCount}个输出，${t.rules.length}条规则）${isActive ? ' [当前]' : ''}`;
    }).join('\n');
    
    return `当前工作区有 ${tables.length} 个决策表：\n${tableList}`;
  }, [tables, activeTableId]);

  // 根据 ID 获取表
  const getTableById = useCallback((id: string): DecisionTableState | undefined => {
    return tables.find(t => t.id === id);
  }, [tables]);

  const value: DecisionTableContextValue = {
    tables,
    activeTableId,
    activeTable,
    createTable,
    updateTable,
    deleteTable,
    setActiveTable,
    getTableSummary,
    getTableById,
  };

  return (
    <DecisionTableContext.Provider value={value}>
      {children}
    </DecisionTableContext.Provider>
  );
}

// Hook 用于访问 Context
export function useDecisionTableContext(): DecisionTableContextValue {
  const context = useContext(DecisionTableContext);
  if (!context) {
    throw new Error('useDecisionTableContext must be used within a DecisionTableProvider');
  }
  return context;
}
