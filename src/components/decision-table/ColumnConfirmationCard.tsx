import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Package, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Variable, DATA_TYPE_LABELS, DataType } from './types';
import { supabase } from '@/integrations/supabase/client';

// 待确认列信息
export interface PendingColumn {
  name?: string;
  label?: string;
  dataType?: DataType;
  needsSelection?: boolean;
}

// 确认后的列信息
export interface ConfirmedColumn {
  name: string;
  label: string;
  dataType: DataType;
  isInput: boolean;
}

interface ColumnConfirmationCardProps {
  pendingInputs?: PendingColumn[];
  pendingOutputs?: PendingColumn[];
  onConfirm: (confirmedInputs: ConfirmedColumn[], confirmedOutputs: ConfirmedColumn[]) => void;
}

// 单个输入列选择器
const InputColumnSelector: React.FC<{
  pending: PendingColumn;
  selectedVariable: Variable | null;
  onSelect: (variable: Variable) => void;
}> = ({ pending, selectedVariable, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVariables = useMemo(() => {
    if (!searchTerm) return MOCK_VARIABLES;
    const lower = searchTerm.toLowerCase();
    return MOCK_VARIABLES.filter(
      v => v.name.toLowerCase().includes(lower) || v.label.toLowerCase().includes(lower)
    );
  }, [searchTerm]);

  const isConfirmed = selectedVariable !== null;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50">
      <div className="min-w-[100px] text-sm font-medium text-foreground">
        {pending.label || pending.name || '未知'}
      </div>
      <div className="flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between h-8 text-sm",
                isConfirmed && "border-primary/50 bg-primary/5"
              )}
            >
              {selectedVariable ? (
                <span className="flex items-center gap-2">
                  <Check className="h-3 w-3 text-primary" />
                  {selectedVariable.name}
                  <span className="text-muted-foreground">({selectedVariable.label})</span>
                </span>
              ) : (
                <span className="text-muted-foreground">选择变量...</span>
              )}
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="搜索变量..." 
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList>
                <CommandEmpty>未找到匹配的变量</CommandEmpty>
                <CommandGroup>
                  {filteredVariables.map((variable) => (
                    <CommandItem
                      key={variable.id}
                      value={variable.name}
                      onSelect={() => {
                        onSelect(variable);
                        setOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedVariable?.id === variable.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{variable.name}</span>
                        <span className="text-xs text-muted-foreground">{variable.label} · {DATA_TYPE_LABELS[variable.dataType]}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

// 单个输出列编辑器
const OutputColumnEditor: React.FC<{
  pending: PendingColumn;
  value: { name: string; dataType: DataType; description: string };
  onChange: (value: { name: string; dataType: DataType; description: string }) => void;
}> = ({ pending, value, onChange }) => {
  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-muted/50">
      <div className="min-w-[80px] text-sm font-medium text-foreground truncate">
        {pending.label || pending.name || '未知'}
      </div>
      <Input
        placeholder="编码"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        className="w-[100px] h-8 text-sm"
      />
      <Select
        value={value.dataType}
        onValueChange={(v) => onChange({ ...value, dataType: v as DataType })}
      >
        <SelectTrigger className="w-[90px] h-8 text-sm">
          <SelectValue placeholder="类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="string">字符串</SelectItem>
          <SelectItem value="integer">整数</SelectItem>
          <SelectItem value="decimal">小数</SelectItem>
          <SelectItem value="boolean">布尔值</SelectItem>
        </SelectContent>
      </Select>
      <Input
        placeholder="描述（可选）"
        value={value.description}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        className="flex-1 h-8 text-sm"
      />
    </div>
  );
};

export const ColumnConfirmationCard: React.FC<ColumnConfirmationCardProps> = ({
  pendingInputs = [],
  pendingOutputs = [],
  onConfirm,
}) => {
  // 输入列选择状态
  const [selectedInputs, setSelectedInputs] = useState<Record<number, Variable | null>>(
    () => {
      const initial: Record<number, Variable | null> = {};
      pendingInputs.forEach((input, index) => {
        // 如果已有 name，尝试匹配已有变量
        if (input.name) {
          const matched = MOCK_VARIABLES.find(v => v.name === input.name);
          initial[index] = matched || null;
        } else {
          initial[index] = null;
        }
      });
      return initial;
    }
  );

  // 输出列编辑状态
  const [outputValues, setOutputValues] = useState<Record<number, { name: string; dataType: DataType; description: string }>>(
    () => {
      const initial: Record<number, { name: string; dataType: DataType; description: string }> = {};
      pendingOutputs.forEach((output, index) => {
        initial[index] = {
          name: output.name || '',
          dataType: output.dataType || 'string',
          description: output.label || '',
        };
      });
      return initial;
    }
  );

  // 检查是否可以确认
  const canConfirm = useMemo(() => {
    // 所有输入列都需要选择
    const inputsValid = pendingInputs.every((_, index) => selectedInputs[index] !== null);
    // 所有输出列都需要填写编码
    const outputsValid = pendingOutputs.every((_, index) => outputValues[index]?.name?.trim());
    return inputsValid && outputsValid;
  }, [pendingInputs, pendingOutputs, selectedInputs, outputValues]);

  // 确认处理
  const handleConfirm = () => {
    const confirmedInputs: ConfirmedColumn[] = pendingInputs.map((pending, index) => {
      const variable = selectedInputs[index]!;
      return {
        name: variable.name,
        label: variable.label,
        dataType: variable.dataType,
        isInput: true,
      };
    });

    const confirmedOutputs: ConfirmedColumn[] = pendingOutputs.map((pending, index) => {
      const value = outputValues[index];
      return {
        name: value.name,
        label: pending.label || value.description || value.name,
        dataType: value.dataType,
        isInput: false,
      };
    });

    onConfirm(confirmedInputs, confirmedOutputs);
  };

  const hasInputs = pendingInputs.length > 0;
  const hasOutputs = pendingOutputs.length > 0;

  if (!hasInputs && !hasOutputs) return null;

  return (
    <Card className="mt-2 border-primary/20 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          请确认列信息
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 输入列确认 */}
        {hasInputs && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PackageOpen className="h-3 w-3" />
              <span>输入列（从变量列表选择）</span>
            </div>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground border-l-2 border-primary/20 pl-3">
              <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <div className="min-w-[100px]">已获取输入</div>
                <div className="flex-1">选择输入</div>
              </div>
              {pendingInputs.map((input, index) => (
                <InputColumnSelector
                  key={index}
                  pending={input}
                  selectedVariable={selectedInputs[index]}
                  onSelect={(variable) => {
                    setSelectedInputs(prev => ({ ...prev, [index]: variable }));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 输出列确认 */}
        {hasOutputs && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              <span>输出列（填写编码和类型）</span>
            </div>
            <div className="flex flex-col gap-2 border-l-2 border-primary/20 pl-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-3">
                <div className="min-w-[80px]">已获取输出</div>
                <div className="w-[100px]">编码</div>
                <div className="w-[90px]">类型</div>
                <div className="flex-1">描述</div>
              </div>
              {pendingOutputs.map((output, index) => (
                <OutputColumnEditor
                  key={index}
                  pending={output}
                  value={outputValues[index]}
                  onChange={(value) => {
                    setOutputValues(prev => ({ ...prev, [index]: value }));
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full"
          size="sm"
        >
          确认并继续
        </Button>
      </CardFooter>
    </Card>
  );
};
