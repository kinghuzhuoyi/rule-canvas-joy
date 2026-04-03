import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FolderPlus } from 'lucide-react';
import { ConditionNode, DataType, COMPARATORS_BY_TYPE, generateId } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useDecisionTableContext } from '@/contexts/DecisionTableContext';
import { cn } from '@/lib/utils';

interface InputOption {
  value: string;
  label: string;
  dataType: DataType;
  group: string;
}

interface ConditionTreeBuilderProps {
  tree: ConditionNode;
  onChange: (tree: ConditionNode) => void;
  excludeTableId?: string;
}

const createEmptyCondition = (): ConditionNode => ({
  id: generateId(),
  type: 'condition',
  leftInput: '',
  comparator: '==',
  rightValue: '',
});

const createEmptyGroup = (): ConditionNode => ({
  id: generateId(),
  type: 'group',
  operator: 'and',
  children: [createEmptyCondition()],
});

export const ConditionTreeBuilder: React.FC<ConditionTreeBuilderProps> = ({
  tree,
  onChange,
  excludeTableId,
}) => {
  const { tables, activeTableId } = useDecisionTableContext();
  const [inputOptions, setInputOptions] = useState<InputOption[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('variables')
        .select('*')
        .order('created_at', { ascending: true });

      const varOptions: InputOption[] = (data || []).map(v => ({
        value: v.code,
        label: `${v.name} (${v.code})`,
        dataType: v.data_type as DataType,
        group: '变量',
      }));

      const currentId = excludeTableId || activeTableId;
      const outputOptions: InputOption[] = [];
      tables.forEach(t => {
        if (t.id === currentId) return;
        const componentType = (t as any).type || 'decision_table';
        if (componentType === 'decision_table') {
          t.columns.filter(c => !c.isInput).forEach(col => {
            outputOptions.push({
              value: `${t.meta.code}.${col.name}`,
              label: `${t.meta.name} → ${col.name}`,
              dataType: col.dataType || 'string',
              group: '决策表输出',
            });
          });
        } else if (componentType === 'script') {
          const config = (t as any).config as any;
          if (config?.outputs) {
            config.outputs.forEach((o: any) => {
              outputOptions.push({
                value: `${t.meta.code}.${o.code}`,
                label: `${t.meta.name} → ${o.name}`,
                dataType: o.dataType || 'string',
                group: '脚本输出',
              });
            });
          }
        } else if (componentType === 'rule') {
          outputOptions.push({
            value: `${t.meta.code}.result`,
            label: `${t.meta.name} → 结果`,
            dataType: 'boolean',
            group: '规则输出',
          });
        }
      });

      setInputOptions([...varOptions, ...outputOptions]);
    })();
  }, [tables, activeTableId, excludeTableId]);

  const getDataTypeForInput = (inputValue: string): DataType => {
    const opt = inputOptions.find(o => o.value === inputValue);
    return opt?.dataType || 'string';
  };

  const updateNode = (root: ConditionNode, nodeId: string, updater: (n: ConditionNode) => ConditionNode): ConditionNode => {
    if (root.id === nodeId) return updater(root);
    if (root.type === 'group' && root.children) {
      return {
        ...root,
        children: root.children.map(c => updateNode(c, nodeId, updater)),
      };
    }
    return root;
  };

  const removeNode = (root: ConditionNode, nodeId: string): ConditionNode | null => {
    if (root.id === nodeId) return null;
    if (root.type === 'group' && root.children) {
      const newChildren = root.children
        .map(c => removeNode(c, nodeId))
        .filter(Boolean) as ConditionNode[];
      if (newChildren.length === 0) return null;
      return { ...root, children: newChildren };
    }
    return root;
  };

  const addChildToGroup = (root: ConditionNode, groupId: string, child: ConditionNode): ConditionNode => {
    if (root.id === groupId && root.type === 'group') {
      return { ...root, children: [...(root.children || []), child] };
    }
    if (root.type === 'group' && root.children) {
      return {
        ...root,
        children: root.children.map(c => addChildToGroup(c, groupId, child)),
      };
    }
    return root;
  };

  const renderCondition = (node: ConditionNode, depth: number, canDelete: boolean) => {
    const dataType = getDataTypeForInput(node.leftInput || '');
    const comparators = COMPARATORS_BY_TYPE[dataType] || COMPARATORS_BY_TYPE.string;

    return (
      <div key={node.id} className="flex items-center gap-2 py-1.5">
        <Select
          value={node.leftInput || ''}
          onValueChange={v => onChange(updateNode(tree, node.id, n => ({ ...n, leftInput: v, comparator: '==' })))}
        >
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue placeholder="选择输入..." />
          </SelectTrigger>
          <SelectContent>
            {inputOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="font-mono text-xs">{opt.value}</span>
                <span className="text-muted-foreground ml-1 text-[10px]">{opt.group}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={node.comparator || '=='}
          onValueChange={v => onChange(updateNode(tree, node.id, n => ({ ...n, comparator: v })))}
        >
          <SelectTrigger className="h-8 text-xs w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {comparators.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {dataType === 'boolean' ? (
          <Select
            value={node.rightValue || 'true'}
            onValueChange={v => onChange(updateNode(tree, node.id, n => ({ ...n, rightValue: v })))}
          >
            <SelectTrigger className="h-8 text-xs w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={node.rightValue || ''}
            onChange={e => onChange(updateNode(tree, node.id, n => ({ ...n, rightValue: e.target.value })))}
            className="h-8 text-xs w-[140px]"
            placeholder="值"
          />
        )}

        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive/70 hover:text-destructive"
            onClick={() => {
              const result = removeNode(tree, node.id);
              if (result) onChange(result);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    );
  };

  const renderGroup = (node: ConditionNode, depth: number, canDelete: boolean) => {
    const children = node.children || [];

    return (
      <div
        key={node.id}
        className={cn(
          "rounded-lg border border-border p-3",
          depth > 0 && "ml-4 bg-muted/20",
          depth === 0 && "bg-card"
        )}
      >
        {/* Group header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center bg-muted rounded-md overflow-hidden border border-border">
            <button
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                node.operator === 'and' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onChange(updateNode(tree, node.id, n => ({ ...n, operator: 'and' })))}
            >
              AND
            </button>
            <button
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                node.operator === 'or' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onChange(updateNode(tree, node.id, n => ({ ...n, operator: 'or' })))}
            >
              OR
            </button>
          </div>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onChange(addChildToGroup(tree, node.id, createEmptyCondition()))}
          >
            <Plus className="h-3 w-3" />
            条件
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onChange(addChildToGroup(tree, node.id, createEmptyGroup()))}
          >
            <FolderPlus className="h-3 w-3" />
            分组
          </Button>

          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/70 hover:text-destructive"
              onClick={() => {
                const result = removeNode(tree, node.id);
                if (result) onChange(result);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Children */}
        <div className="flex flex-col gap-1">
          {children.map((child, i) => (
            <React.Fragment key={child.id}>
              {i > 0 && (
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    {node.operator === 'and' ? 'AND' : 'OR'}
                  </span>
                  <div className="flex-1 border-t border-dashed border-border" />
                </div>
              )}
              {child.type === 'group'
                ? renderGroup(child, depth + 1, children.length > 1)
                : renderCondition(child, depth + 1, children.length > 1)}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {tree.type === 'group' ? renderGroup(tree, 0, false) : renderCondition(tree, 0, false)}
    </div>
  );
};

export { createEmptyGroup, createEmptyCondition };
