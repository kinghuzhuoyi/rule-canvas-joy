import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AIGeneratedTable } from '@/services/aiService';
import { AlertTriangle, FileText, Columns, List } from 'lucide-react';

interface ApplyConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: AIGeneratedTable | null;
  hasExistingData: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ApplyConfirmDialog: React.FC<ApplyConfirmDialogProps> = ({
  open,
  onOpenChange,
  table,
  hasExistingData,
  onConfirm,
  onCancel,
}) => {
  if (!table) return null;

  const inputColumns = table.columns.filter(c => c.isInput);
  const outputColumns = table.columns.filter(c => !c.isInput);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>确认应用决策表</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>即将应用以下决策表：</p>
              
              {/* 表格信息摘要 */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">名称:</span>
                  <span className="font-medium text-foreground">{table.meta.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-xs text-center text-muted-foreground font-mono">ID</span>
                  <span className="text-muted-foreground">编码:</span>
                  <span className="font-mono text-foreground">{table.meta.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Columns className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">列数:</span>
                  <span className="text-foreground">
                    {table.columns.length} (输入: {inputColumns.length}, 输出: {outputColumns.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">规则:</span>
                  <span className="text-foreground">{table.rules.length} 条</span>
                </div>
              </div>

              {/* 覆盖警告 */}
              {hasExistingData && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-destructive">
                    <p className="font-medium">注意</p>
                    <p>此操作将覆盖当前编辑器中的决策表数据，且无法撤销。</p>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认应用</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
