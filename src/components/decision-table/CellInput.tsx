import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataType, validateRangeExpression, validateOutputValue, DATA_TYPE_LABELS } from './types';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface CellInputProps {
  value: string;
  dataType: DataType;
  isInput: boolean;
  isSelected: boolean;
  onChange: (value: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
}

// 获取输入提示文本
const getPlaceholder = (dataType: DataType, isInput: boolean): string => {
  if (isInput) {
    switch (dataType) {
      case 'integer':
      case 'decimal':
        return '如: 100 或 (0,100]';
      case 'string':
        return '输入文本...';
      case 'boolean':
        return '选择...';
      default:
        return '';
    }
  } else {
    switch (dataType) {
      case 'integer':
        return '输入整数';
      case 'decimal':
        return '输入数值';
      case 'string':
        return '输入文本';
      case 'boolean':
        return '选择...';
      default:
        return '';
    }
  }
};

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
  const [isValid, setIsValid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setLocalValue(value);
    // 同步外部值时清除错误状态
    setError(null);
  }, [value]);

  // 实时验证函数
  const validate = useCallback((val: string): { valid: boolean; message?: string } => {
    if (!val.trim()) {
      return { valid: true }; // 空值允许
    }
    
    if (isInput) {
      // 输入列：数值类型需要验证区间表达式
      if (dataType === 'integer' || dataType === 'decimal') {
        return validateRangeExpression(val);
      }
      // 字符串类型不需要特殊验证
      return { valid: true };
    } else {
      // 输出列：验证值是否符合数据类型
      return validateOutputValue(val, dataType);
    }
  }, [dataType, isInput]);

  // 输入变化时实时验证
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // 实时验证（只在有内容时验证）
    if (newValue.trim()) {
      const result = validate(newValue);
      if (!result.valid) {
        setError(result.message || '格式错误');
        setIsValid(false);
      } else {
        setError(null);
        setIsValid(true);
      }
    } else {
      setError(null);
      setIsValid(false);
    }
  }, [validate]);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    
    // 最终验证
    const result = validate(localValue);
    if (!result.valid) {
      setError(result.message || '格式错误');
      setIsValid(false);
      return;
    }
    
    setError(null);
    if (localValue.trim()) {
      setIsValid(true);
    }
    
    // 只有值变化时才触发onChange
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange, validate]);
  
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // 按键处理：Enter确认，Escape取消
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalValue(value);
      setError(null);
      inputRef.current?.blur();
    }
  }, [value]);
  
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
            <SelectItem value="true">
              <span className="text-green-600 font-medium">true</span>
            </SelectItem>
            <SelectItem value="false">
              <span className="text-red-500 font-medium">false</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        "relative h-full w-full min-w-[100px] group/cell",
        isSelected && !isFocused && "ring-2 ring-primary ring-inset",
        error && "ring-2 ring-destructive ring-inset",
        isValid && !error && localValue.trim() && !isFocused && "bg-green-50/30 dark:bg-green-950/10"
      )}
      onMouseEnter={onMouseEnter}
    >
      <Input
        ref={inputRef}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseDown={onMouseDown}
        className={cn(
          "h-full border-0 rounded-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
          "bg-transparent text-sm pr-7",
          error && "text-destructive"
        )}
        placeholder={getPlaceholder(dataType, isInput)}
      />
      
      {/* 验证状态图标 */}
      {localValue.trim() && !isFocused && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {error ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : isValid ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 opacity-60" />
          ) : null}
        </div>
      )}
      
      {/* 错误提示气泡 - 仅在聚焦时显示 */}
      {error && isFocused && (
        <div className="absolute left-0 top-full z-20 mt-1 px-2.5 py-1.5 bg-destructive text-destructive-foreground text-xs rounded-md shadow-lg whitespace-nowrap flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
          {/* 小三角箭头 */}
          <div className="absolute -top-1 left-3 w-2 h-2 bg-destructive rotate-45" />
        </div>
      )}
      
      {/* 输入提示（悬浮时显示） */}
      {!localValue && !isFocused && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50 pointer-events-none opacity-0 group-hover/cell:opacity-100 transition-opacity">
          {DATA_TYPE_LABELS[dataType]}
        </div>
      )}
    </div>
  );
};
