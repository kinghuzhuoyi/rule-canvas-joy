import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataType, validateRangeExpression, validateOutputValue } from './types';
import { cn } from '@/lib/utils';

interface CellInputProps {
  value: string;
  dataType: DataType;
  isInput: boolean;
  isSelected: boolean;
  onChange: (value: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
}

export const CellInput: React.FC<CellInputProps> = ({
  value,
  dataType,
  isInput,
  isSelected,
  onChange,
  onMouseDown,
  onMouseEnter,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  const handleBlur = () => {
    setIsFocused(false);
    
    // 验证
    if (isInput && (dataType === 'integer' || dataType === 'decimal')) {
      const result = validateRangeExpression(localValue);
      if (!result.valid) {
        setError(result.message || '格式错误');
        return;
      }
    } else if (!isInput) {
      const result = validateOutputValue(localValue, dataType);
      if (!result.valid) {
        setError(result.message || '格式错误');
        return;
      }
    }
    
    setError(null);
    if (localValue !== value) {
      onChange(localValue);
    }
  };
  
  const handleFocus = () => {
    setIsFocused(true);
    setError(null);
  };
  
  // 布尔值使用下拉选择
  if (dataType === 'boolean') {
    return (
      <div
        className={cn(
          "h-full w-full min-w-[100px]",
          isSelected && "ring-2 ring-primary ring-inset"
        )}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
      >
        <Select value={localValue} onValueChange={v => { setLocalValue(v); onChange(v); }}>
          <SelectTrigger className="h-full border-0 rounded-none focus:ring-0 bg-transparent">
            <SelectValue placeholder="选择..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        "relative h-full w-full min-w-[100px]",
        isSelected && !isFocused && "ring-2 ring-primary ring-inset",
        error && "ring-2 ring-destructive ring-inset"
      )}
      onMouseDown={e => {
        if (!isFocused) {
          onMouseDown(e);
        }
      }}
      onMouseEnter={onMouseEnter}
    >
      <Input
        ref={inputRef}
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          "h-full border-0 rounded-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
          "bg-transparent text-sm"
        )}
        placeholder={
          isInput && (dataType === 'integer' || dataType === 'decimal')
            ? '单值或区间'
            : ''
        }
      />
      {error && (
        <div className="absolute left-0 top-full z-10 mt-1 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded shadow-lg whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
};
