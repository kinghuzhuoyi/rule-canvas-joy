import React from 'react';
import { ConditionNode, RuleComponentConfig, generateId } from './types';
import { ConditionTreeBuilder, createEmptyGroup } from './ConditionTreeBuilder';
import { cn } from '@/lib/utils';

interface RuleEditorProps {
  config: RuleComponentConfig;
  onChange: (config: RuleComponentConfig) => void;
  tableId?: string;
  className?: string;
}

const getDefaultConfig = (): RuleComponentConfig => ({
  conditionTree: createEmptyGroup(),
});

export const RuleEditor: React.FC<RuleEditorProps> = ({
  config,
  onChange,
  tableId,
  className,
}) => {
  const currentConfig = config?.conditionTree ? config : getDefaultConfig();

  const handleTreeChange = (tree: ConditionNode) => {
    onChange({ conditionTree: tree });
  };

  // Generate expression preview
  const renderExpressionPreview = (node: ConditionNode): string => {
    if (node.type === 'condition') {
      const left = node.leftInput || '?';
      const op = node.comparator || '==';
      const right = node.rightValue || '?';
      return `${left} ${op} ${right}`;
    }
    if (node.type === 'group' && node.children) {
      const parts = node.children.map(c => renderExpressionPreview(c));
      const joined = parts.join(` ${node.operator?.toUpperCase() || 'AND'} `);
      return node.children.length > 1 ? `(${joined})` : joined;
    }
    return '';
  };

  return (
    <div className={cn("flex flex-col gap-4 p-4 overflow-auto", className)}>
      {/* Expression preview */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="text-[10px] font-medium text-muted-foreground uppercase mb-1">表达式预览</div>
        <code className="text-xs text-foreground font-mono break-all">
          {renderExpressionPreview(currentConfig.conditionTree) || '(空)'}
        </code>
      </div>

      {/* Condition tree builder */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">条件配置</div>
        <ConditionTreeBuilder
          tree={currentConfig.conditionTree}
          onChange={handleTreeChange}
          excludeTableId={tableId}
        />
      </div>

      {/* Output description */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="text-[10px] font-medium text-muted-foreground uppercase mb-1">输出说明</div>
        <p className="text-xs text-muted-foreground">
          规则组件的输出为布尔值 <code className="text-foreground bg-muted px-1 rounded">result</code>，
          其他组件可通过 <code className="text-foreground bg-muted px-1 rounded">规则编码.result</code> 引用。
        </p>
      </div>
    </div>
  );
};

export { getDefaultConfig as getDefaultRuleConfig };
