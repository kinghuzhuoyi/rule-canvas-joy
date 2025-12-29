import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Check, FileSpreadsheet } from 'lucide-react';
import { Column, TestCase } from './types';
import { parseTableData, generateTemplateHint } from './testCaseUtils';
import { cn } from '@/lib/utils';

interface TestCaseImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Column[];
  onImport: (cases: TestCase[]) => void;
}

export const TestCaseImportDialog: React.FC<TestCaseImportDialogProps> = ({
  open,
  onOpenChange,
  columns,
  onImport,
}) => {
  const [rawData, setRawData] = useState('');
  const [parseResult, setParseResult] = useState<{
    cases: TestCase[];
    errors: string[];
  } | null>(null);

  const templateHint = useMemo(() => generateTemplateHint(columns), [columns]);

  const handleParse = () => {
    if (!rawData.trim()) {
      setParseResult({ cases: [], errors: ['请粘贴数据'] });
      return;
    }
    const result = parseTableData(rawData, columns);
    setParseResult(result);
  };

  const handleImport = () => {
    if (parseResult && parseResult.cases.length > 0) {
      onImport(parseResult.cases);
      handleClose();
    }
  };

  const handleClose = () => {
    setRawData('');
    setParseResult(null);
    onOpenChange(false);
  };

  const inputColumns = columns.filter(c => c.isInput);
  const outputColumns = columns.filter(c => !c.isInput);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            批量导入测试用例
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* 模板提示 */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              从 Excel 或其他表格复制数据，格式参考：
            </Label>
            <pre className="text-xs bg-muted p-2 rounded border border-border overflow-x-auto font-mono">
              {templateHint}
            </pre>
          </div>

          {/* 粘贴区域 */}
          <div className="space-y-2">
            <Label>粘贴数据</Label>
            <Textarea
              value={rawData}
              onChange={e => {
                setRawData(e.target.value);
                setParseResult(null);
              }}
              placeholder="在此粘贴表格数据（Tab 分隔）..."
              className="min-h-[120px] font-mono text-sm"
            />
          </div>

          {/* 解析按钮 */}
          <Button variant="outline" size="sm" onClick={handleParse}>
            解析数据
          </Button>

          {/* 预览结果 */}
          {parseResult && (
            <div className="space-y-2">
              {parseResult.errors.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {parseResult.errors.join('; ')}
                </div>
              )}

              {parseResult.cases.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    解析成功，共 {parseResult.cases.length} 条用例
                  </div>
                  
                  <ScrollArea className="h-[150px] border border-border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left text-muted-foreground">#</th>
                          {inputColumns.map(col => (
                            <th key={col.id} className="p-2 text-left text-muted-foreground">
                              {col.name}
                            </th>
                          ))}
                          {outputColumns.map(col => (
                            <th key={col.id} className="p-2 text-left text-muted-foreground">
                              {col.name} (预期)
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.cases.map((tc, idx) => (
                          <tr key={tc.id} className="border-t border-border">
                            <td className="p-2 text-muted-foreground">{idx + 1}</td>
                            {inputColumns.map(col => (
                              <td key={col.id} className="p-2 font-mono">
                                {tc.inputs[col.id] || '-'}
                              </td>
                            ))}
                            {outputColumns.map(col => (
                              <td key={col.id} className="p-2 font-mono">
                                {tc.expectedOutputs[col.id] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parseResult || parseResult.cases.length === 0}
          >
            导入 {parseResult?.cases.length || 0} 条用例
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
