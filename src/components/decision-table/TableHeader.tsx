import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Pencil, Check } from 'lucide-react';
import { Column, DataType, Variable, DATA_TYPE_LABELS } from './types';
import { VariableSelector } from './VariableSelector';
import { cn } from '@/lib/utils';

interface TableHeaderProps {
  columns: Column[];
  onAddInputColumn: (variable: Variable) => void;
  onAddOutputColumn: (name: string, dataType: DataType) => void;
  onEditColumn: (columnId: string, name: string, dataType: DataType) => void;
  onDeleteColumn: (columnId: string) => void;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  onAddInputColumn,
  onAddOutputColumn,
  onEditColumn,
  onDeleteColumn,
}) => {
  const [showInputSelector, setShowInputSelector] = useState(false);
  const [showOutputEditor, setShowOutputEditor] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newOutputName, setNewOutputName] = useState('');
  const [newOutputType, setNewOutputType] = useState<DataType>('string');
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<DataType>('string');
  
  const inputColumns = columns.filter(c => c.isInput);
  const outputColumns = columns.filter(c => !c.isInput);
  
  const handleAddOutput = () => {
    if (newOutputName.trim()) {
      onAddOutputColumn(newOutputName.trim(), newOutputType);
      setNewOutputName('');
      setNewOutputType('string');
      setShowOutputEditor(false);
    }
  };
  
  const startEditing = (column: Column) => {
    setEditingColumnId(column.id);
    setEditName(column.name);
    setEditType(column.dataType);
  };
  
  const saveEdit = (columnId: string) => {
    if (editName.trim()) {
      onEditColumn(columnId, editName.trim(), editType);
    }
    setEditingColumnId(null);
  };
  
  const canDeleteInput = inputColumns.length > 1;
  const canDeleteOutput = outputColumns.length > 1;
  
  const renderColumnHeader = (column: Column, canDelete: boolean) => {
    const isEditing = editingColumnId === column.id;
    
    if (isEditing) {
      return (
        <div className="flex flex-col gap-2 p-2 w-[140px] flex-shrink-0" key={column.id}>
          <Input
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="h-7 text-sm"
            autoFocus
          />
          {!column.isInput && (
            <Select value={editType} onValueChange={v => setEditType(v as DataType)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATA_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => saveEdit(column.id)}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setEditingColumnId(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div
        key={column.id}
        className={cn(
          "group relative flex flex-col items-center justify-center p-2 w-[140px] flex-shrink-0",
          "border-r border-border last:border-r-0"
        )}
      >
        <div className="flex items-center gap-1">
          <span className="font-medium text-sm">{column.name}</span>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
            onClick={() => startEditing(column)}
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {DATA_TYPE_LABELS[column.dataType]}
        </span>
        {canDelete && (
          <button
            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-destructive text-destructive-foreground rounded-full"
            onClick={() => onDeleteColumn(column.id)}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex sticky top-0 z-20 bg-card border-b border-border min-w-max">
      {/* 拖拽手柄占位 */}
      <div className="w-8 flex-shrink-0 bg-muted/50 border-r border-border" />
      
      {/* 输入列区域 */}
      <div className="flex bg-secondary/30">
        {inputColumns.map(col => renderColumnHeader(col, canDeleteInput))}
        
        {/* 添加输入列 */}
        <div className="relative flex items-center justify-center w-[48px] flex-shrink-0 border-r border-border">
          {showInputSelector ? (
            <div className="absolute top-full left-0 mt-1 z-50">
              <VariableSelector
                onSelect={variable => {
                  onAddInputColumn(variable);
                  setShowInputSelector(false);
                }}
                onCancel={() => setShowInputSelector(false)}
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowInputSelector(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* 分隔线 */}
      <div className="w-1 bg-border flex-shrink-0" />
      
      {/* 输出列区域 */}
      <div className="flex bg-primary/5">
        {outputColumns.map(col => renderColumnHeader(col, canDeleteOutput))}
        
        {/* 添加输出列 */}
        <div className="relative flex items-center justify-center w-[48px] flex-shrink-0">
          {showOutputEditor ? (
            <div className="absolute top-full left-0 mt-1 z-50 p-3 bg-card border border-border rounded-lg shadow-lg min-w-[200px]">
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="列名称"
                  value={newOutputName}
                  onChange={e => setNewOutputName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Select value={newOutputType} onValueChange={v => setNewOutputType(v as DataType)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="数据类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DATA_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7" onClick={handleAddOutput}>
                    添加
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowOutputEditor(false)}>
                    取消
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowOutputEditor(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* 删除按钮占位 */}
      <div className="w-10 flex-shrink-0 bg-muted/50 border-l border-border" />
    </div>
  );
};
