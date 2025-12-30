import React from 'react';
import { AIGeneratedTable } from '@/services/aiService';
import { DATA_TYPE_LABELS } from './types';
import { Button } from '@/components/ui/button';
import { Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneratedTablePreviewProps {
  table: AIGeneratedTable;
  onApply: (table: AIGeneratedTable) => void;
  isApplied?: boolean;
}

export const GeneratedTablePreview: React.FC<GeneratedTablePreviewProps> = ({
  table,
  onApply,
  isApplied = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const inputColumns = table.columns.filter(c => c.isInput);
  const outputColumns = table.columns.filter(c => !c.isInput);

  // 创建列 ID 到名称的映射
  const columnIdToName: Record<string, string> = {};
  table.columns.forEach(col => {
    columnIdToName[col.id] = col.name;
  });

  return (
    <div className="mt-3 rounded-lg border border-border bg-card overflow-hidden">
      {/* 头部信息 */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{table.meta.code}</span>
            <span className="text-sm font-medium truncate">{table.meta.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2"
          >
            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            variant={isApplied ? "secondary" : "default"}
            size="sm"
            onClick={() => onApply(table)}
            disabled={isApplied}
            className="h-7"
          >
            {isApplied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" />
                已应用
              </>
            ) : (
              '应用到编辑器'
            )}
          </Button>
        </div>
      </div>

      {/* 展开的详情 */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* 列信息 */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">输入:</span>
              {inputColumns.map(col => (
                <span key={col.id} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                  {col.name}
                  <span className="text-muted-foreground ml-1">({DATA_TYPE_LABELS[col.dataType]})</span>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">输出:</span>
              {outputColumns.map(col => (
                <span key={col.id} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded">
                  {col.name}
                  <span className="text-muted-foreground ml-1">({DATA_TYPE_LABELS[col.dataType]})</span>
                </span>
              ))}
            </div>
          </div>

          {/* 规则预览表格 */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-2 py-1.5 text-left font-medium border border-border text-muted-foreground">#</th>
                  {table.columns.map(col => (
                    <th
                      key={col.id}
                      className={cn(
                        "px-2 py-1.5 text-left font-medium border border-border",
                        col.isInput ? "bg-primary/5" : "bg-secondary/30"
                      )}
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rules.slice(0, 5).map((rule, index) => (
                  <tr key={rule.id} className="hover:bg-muted/20">
                    <td className="px-2 py-1 border border-border text-muted-foreground">{index + 1}</td>
                    {table.columns.map(col => (
                      <td key={col.id} className="px-2 py-1 border border-border font-mono">
                        {rule.cells[col.id] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.rules.length > 5 && (
                  <tr>
                    <td
                      colSpan={table.columns.length + 1}
                      className="px-2 py-1 border border-border text-center text-muted-foreground"
                    >
                      ... 还有 {table.rules.length - 5} 条规则
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
