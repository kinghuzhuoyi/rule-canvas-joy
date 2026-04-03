import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Variable, DataType, DATA_TYPE_LABELS } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useDecisionTableContext } from '@/contexts/DecisionTableContext';
import { cn } from '@/lib/utils';

interface VariableSelectorProps {
  onSelect: (variable: Variable) => void;
  onCancel: () => void;
  /** Exclude variables from a specific table (to avoid self-referencing outputs) */
  excludeTableId?: string;
}

interface SelectableItem {
  id: string;
  name: string;
  label: string;
  dataType: DataType;
  group: 'variable' | 'output';
  sourceTable?: string; // e.g. "cust_seg"
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({ onSelect, onCancel, excludeTableId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState<SelectableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { tables, activeTableId } = useDecisionTableContext();
  
  // Load managed variables from DB
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('variables')
        .select('*')
        .order('created_at', { ascending: true });
      
      const variableItems: SelectableItem[] = (data || []).map(v => ({
        id: `var_${v.id}`,
        name: v.code,
        label: v.name,
        dataType: v.data_type as DataType,
        group: 'variable' as const,
      }));
      
      // Build output items from other components (decision tables, scripts, rules)
      const currentTableId = excludeTableId || activeTableId;
      const outputItems: SelectableItem[] = [];
      tables.forEach(t => {
        if (t.id === currentTableId) return;
        const componentType = (t as any).type || 'decision_table';
        
        if (componentType === 'decision_table') {
          const outputCols = t.columns.filter(c => !c.isInput);
          outputCols.forEach(col => {
            outputItems.push({
              id: `output_${t.id}_${col.id}`,
              name: `${t.meta.code}.${col.name}`,
              label: `${t.meta.name} → ${col.name}`,
              dataType: col.dataType || 'string',
              group: 'output',
              sourceTable: t.meta.code,
            });
          });
        } else if (componentType === 'script') {
          const config = (t as any).config as any;
          if (config?.outputs) {
            config.outputs.forEach((o: any) => {
              outputItems.push({
                id: `output_${t.id}_${o.id || o.code}`,
                name: `${t.meta.code}.${o.code}`,
                label: `${t.meta.name} → ${o.name}`,
                dataType: o.dataType || 'string',
                group: 'output',
                sourceTable: t.meta.code,
              });
            });
          }
        } else if (componentType === 'rule') {
          outputItems.push({
            id: `output_${t.id}_result`,
            name: `${t.meta.code}.result`,
            label: `${t.meta.name} → 结果`,
            dataType: 'boolean',
            group: 'output',
            sourceTable: t.meta.code,
          });
        }
      });
      
      setItems([...variableItems, ...outputItems]);
      setLoading(false);
    })();
  }, [tables, activeTableId, excludeTableId]);
  
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(
      v => v.name.toLowerCase().includes(lower) || v.label.toLowerCase().includes(lower)
    );
  }, [searchTerm, items]);
  
  const variableItems = filteredItems.filter(i => i.group === 'variable');
  const outputItems = filteredItems.filter(i => i.group === 'output');
  
  const handleSelect = (item: SelectableItem) => {
    const variable: Variable = {
      id: item.id,
      name: item.name,
      label: item.label,
      dataType: item.dataType,
    };
    onSelect(variable);
  };
  
  return (
    <div className="flex flex-col gap-2 p-3 bg-card border border-border rounded-lg shadow-lg min-w-[280px]">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索变量或决策表输出..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
            autoFocus
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="max-h-[280px] overflow-y-auto">
        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-4">加载中…</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            未找到匹配的变量或输出
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Variables section */}
            {variableItems.length > 0 && (
              <>
                <div className="text-[10px] font-medium text-muted-foreground uppercase px-3 py-1">变量</div>
                {variableItems.map(item => (
                  <button
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-md text-sm",
                      "hover:bg-accent transition-colors text-left"
                    )}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground font-mono text-xs">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded text-secondary-foreground">
                      {DATA_TYPE_LABELS[item.dataType] || item.dataType}
                    </span>
                  </button>
                ))}
              </>
            )}
            
            {/* Decision table outputs section */}
            {outputItems.length > 0 && (
              <>
                <div className="text-[10px] font-medium text-muted-foreground uppercase px-3 py-1 mt-1">决策表输出</div>
                {outputItems.map(item => (
                  <button
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-md text-sm",
                      "hover:bg-accent transition-colors text-left"
                    )}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground font-mono text-xs">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 rounded text-primary">
                      {DATA_TYPE_LABELS[item.dataType] || item.dataType}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
