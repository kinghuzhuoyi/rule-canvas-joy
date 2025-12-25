import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Variable, MOCK_VARIABLES, DATA_TYPE_LABELS } from './types';
import { cn } from '@/lib/utils';

interface VariableSelectorProps {
  onSelect: (variable: Variable) => void;
  onCancel: () => void;
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({ onSelect, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredVariables = useMemo(() => {
    if (!searchTerm) return MOCK_VARIABLES;
    const lower = searchTerm.toLowerCase();
    return MOCK_VARIABLES.filter(
      v => v.name.toLowerCase().includes(lower) || v.label.toLowerCase().includes(lower)
    );
  }, [searchTerm]);
  
  return (
    <div className="flex flex-col gap-2 p-3 bg-card border border-border rounded-lg shadow-lg min-w-[240px]">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索变量..."
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
      
      <div className="max-h-[200px] overflow-y-auto">
        {filteredVariables.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            未找到匹配的变量
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredVariables.map(variable => (
              <button
                key={variable.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md text-sm",
                  "hover:bg-accent transition-colors text-left"
                )}
                onClick={() => onSelect(variable)}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{variable.name}</span>
                  <span className="text-xs text-muted-foreground">{variable.label}</span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-secondary rounded text-secondary-foreground">
                  {DATA_TYPE_LABELS[variable.dataType]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
