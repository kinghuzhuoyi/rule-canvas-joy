import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScriptComponentConfig, ScriptOutput, DataType, generateId } from './types';
import { ScriptOutputDefiner } from './ScriptOutputDefiner';
import { supabase } from '@/integrations/supabase/client';
import { useDecisionTableContext } from '@/contexts/DecisionTableContext';
import { cn } from '@/lib/utils';

interface ScriptEditorProps {
  config: ScriptComponentConfig;
  onChange: (config: ScriptComponentConfig) => void;
  tableId?: string;
  className?: string;
}

interface SuggestionItem {
  value: string;
  label: string;
  type: 'variable' | 'output' | 'function';
}

const BUILTIN_FUNCTIONS: SuggestionItem[] = [
  { value: 'Math.abs(x)', label: 'Math.abs - 绝对值', type: 'function' },
  { value: 'Math.max(a,b)', label: 'Math.max - 最大值', type: 'function' },
  { value: 'Math.min(a,b)', label: 'Math.min - 最小值', type: 'function' },
  { value: 'Math.round(x)', label: 'Math.round - 四舍五入', type: 'function' },
  { value: 'Math.floor(x)', label: 'Math.floor - 向下取整', type: 'function' },
  { value: 'Math.ceil(x)', label: 'Math.ceil - 向上取整', type: 'function' },
  { value: 'String(x)', label: 'String - 转字符串', type: 'function' },
  { value: 'Number(x)', label: 'Number - 转数字', type: 'function' },
  { value: 'parseInt(x)', label: 'parseInt - 转整数', type: 'function' },
  { value: 'parseFloat(x)', label: 'parseFloat - 转小数', type: 'function' },
];

const getDefaultConfig = (): ScriptComponentConfig => ({
  outputs: [{ id: generateId(), code: 'result', name: '结果', dataType: 'string' }],
  script: '// 在此编写脚本逻辑\n// 可用变量会在输入时自动联想\n\nreturn result;',
});

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  config,
  onChange,
  tableId,
  className,
}) => {
  const currentConfig = config?.outputs ? config : getDefaultConfig();
  const { tables, activeTableId } = useDecisionTableContext();
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SuggestionItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load input suggestions
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('variables')
        .select('*')
        .order('created_at', { ascending: true });

      const varItems: SuggestionItem[] = (data || []).map(v => ({
        value: v.code,
        label: `${v.name} (${v.code})`,
        type: 'variable' as const,
      }));

      const currentId = tableId || activeTableId;
      const outputItems: SuggestionItem[] = [];
      tables.forEach(t => {
        if (t.id === currentId) return;
        const componentType = (t as any).type || 'decision_table';
        if (componentType === 'decision_table') {
          t.columns.filter(c => !c.isInput).forEach(col => {
            outputItems.push({
              value: `${t.meta.code}.${col.name}`,
              label: `${t.meta.name} → ${col.name}`,
              type: 'output',
            });
          });
        } else if (componentType === 'script') {
          const cfg = (t as any).config as ScriptComponentConfig | undefined;
          cfg?.outputs?.forEach(o => {
            outputItems.push({
              value: `${t.meta.code}.${o.code}`,
              label: `${t.meta.name} → ${o.name}`,
              type: 'output',
            });
          });
        } else if (componentType === 'rule') {
          outputItems.push({
            value: `${t.meta.code}.result`,
            label: `${t.meta.name} → 结果`,
            type: 'output',
          });
        }
      });

      setSuggestions([...varItems, ...outputItems, ...BUILTIN_FUNCTIONS]);
    })();
  }, [tables, activeTableId, tableId]);

  const handleOutputsChange = (outputs: ScriptOutput[]) => {
    onChange({ ...currentConfig, outputs });
  };

  const handleScriptChange = (script: string) => {
    onChange({ ...currentConfig, script });
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '/' || e.key === '.') {
      // Show suggestions on typing trigger chars
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const lastWord = textBefore.split(/[\s()+\-*/=<>!,;{}[\]]+/).pop() || '';
        
        if (lastWord.length > 0) {
          const lower = lastWord.toLowerCase();
          const filtered = suggestions.filter(s =>
            s.value.toLowerCase().includes(lower) || s.label.toLowerCase().includes(lower)
          );
          setFilteredSuggestions(filtered.slice(0, 8));
          setShowSuggestions(filtered.length > 0);
        }
      }, 0);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorPos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, cursorPos);
    const lastWord = textBefore.split(/[\s()+\-*/=<>!,;{}[\]]+/).pop() || '';

    if (lastWord.length >= 2) {
      const lower = lastWord.toLowerCase();
      const filtered = suggestions.filter(s =>
        s.value.toLowerCase().includes(lower) || s.label.toLowerCase().includes(lower)
      );
      setFilteredSuggestions(filtered.slice(0, 8));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [suggestions]);

  const insertSuggestion = (item: SuggestionItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    const before = text.substring(0, cursorPos);
    const after = text.substring(cursorPos);

    // Replace the last partial word
    const lastWordMatch = before.match(/[\w.]+$/);
    const startPos = lastWordMatch ? cursorPos - lastWordMatch[0].length : cursorPos;
    const newText = text.substring(0, startPos) + item.value + after;
    
    handleScriptChange(newText);
    setShowSuggestions(false);

    setTimeout(() => {
      textarea.focus();
      const newPos = startPos + item.value.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className={cn("flex flex-col gap-4 p-4 overflow-auto", className)}>
      {/* Output definitions */}
      <ScriptOutputDefiner
        outputs={currentConfig.outputs}
        onChange={handleOutputsChange}
      />

      {/* Script editor */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">脚本逻辑 (Aviator 语法)</span>
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={currentConfig.script}
            onChange={e => handleScriptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="font-mono text-xs min-h-[240px] bg-muted/20 resize-y"
            placeholder="// 在此编写脚本逻辑..."
            spellCheck={false}
          />

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 top-full mt-1 w-80 bg-popover border border-border rounded-lg shadow-lg max-h-[200px] overflow-auto">
              {filteredSuggestions.map((s, i) => (
                <button
                  key={`${s.value}-${i}`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors"
                  onMouseDown={e => {
                    e.preventDefault();
                    insertSuggestion(s);
                  }}
                >
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    s.type === 'variable' && "bg-blue-500/10 text-blue-600",
                    s.type === 'output' && "bg-green-500/10 text-green-600",
                    s.type === 'function' && "bg-amber-500/10 text-amber-600",
                  )}>
                    {s.type === 'variable' ? 'VAR' : s.type === 'output' ? 'OUT' : 'FN'}
                  </span>
                  <span className="font-mono text-foreground">{s.value}</span>
                  <span className="text-muted-foreground ml-auto truncate">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Help */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="text-[10px] font-medium text-muted-foreground uppercase mb-1">使用说明</div>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>输入变量名后自动联想可用变量和函数</li>
          <li>使用 <code className="text-foreground bg-muted px-1 rounded">if/else</code> 进行条件判断</li>
          <li>使用 <code className="text-foreground bg-muted px-1 rounded">return</code> 返回结果</li>
          <li>其他组件可通过 <code className="text-foreground bg-muted px-1 rounded">脚本编码.输出编码</code> 引用输出</li>
        </ul>
      </div>
    </div>
  );
};

export { getDefaultConfig as getDefaultScriptConfig };
