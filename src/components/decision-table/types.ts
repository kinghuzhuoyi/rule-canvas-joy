// 数据类型定义
export type DataType = 'string' | 'integer' | 'decimal' | 'boolean';

// 变量定义（用于输入列）
export interface Variable {
  id: string;
  name: string;
  label: string;
  dataType: DataType;
}

// 列定义
export interface Column {
  id: string;
  name: string;
  dataType: DataType;
  isInput: boolean; // true = 输入列, false = 输出列
  variableId?: string; // 仅输入列有
}

// 单元格值
export interface CellValue {
  columnId: string;
  value: string;
}

// 规则行
export interface Rule {
  id: string;
  cells: Record<string, string>; // columnId -> value
}

// 决策表数据结构
export interface DecisionTableData {
  columns: Column[];
  rules: Rule[];
}

// 选中单元格
export interface SelectedCell {
  ruleId: string;
  columnId: string;
}

// 选中区域
export interface SelectionRange {
  startRuleIndex: number;
  endRuleIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

// 验证错误
export interface ValidationError {
  ruleId: string;
  columnId: string;
  message: string;
}

// 模拟变量数据
export const MOCK_VARIABLES: Variable[] = [
  { id: 'var_1', name: 'product_id', label: '产品编码', dataType: 'string' },
  { id: 'var_2', name: 'score', label: '评分', dataType: 'integer' },
  { id: 'var_3', name: 'amount', label: '金额', dataType: 'decimal' },
  { id: 'var_4', name: 'is_vip', label: 'VIP状态', dataType: 'boolean' },
  { id: 'var_5', name: 'region', label: '地区', dataType: 'string' },
  { id: 'var_6', name: 'age', label: '年龄', dataType: 'integer' },
  { id: 'var_7', name: 'balance', label: '余额', dataType: 'decimal' },
  { id: 'var_8', name: 'is_active', label: '是否激活', dataType: 'boolean' },
  { id: 'var_9', name: 'category', label: '类别', dataType: 'string' },
  { id: 'var_10', name: 'level', label: '等级', dataType: 'integer' },
];

// 数据类型显示名称
export const DATA_TYPE_LABELS: Record<DataType, string> = {
  string: '字符串',
  integer: '整数',
  decimal: '小数',
  boolean: '布尔值',
};

// 数据类型图标和颜色
export const DATA_TYPE_ICONS: Record<DataType, { icon: string; color: string }> = {
  string: { icon: 'A', color: 'text-blue-500' },
  integer: { icon: '#', color: 'text-green-600' },
  decimal: { icon: '#.', color: 'text-amber-500' },
  boolean: { icon: '⊤', color: 'text-purple-500' },
};

// 生成唯一ID
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 验证区间表达式
export const validateRangeExpression = (value: string): { valid: boolean; message?: string } => {
  if (!value) return { valid: true };
  
  // 检查是否是区间表达式
  const rangePattern = /^[\[\(](-?inf|-?\d+\.?\d*),\s*(-?inf|\+?inf|-?\d+\.?\d*)[\]\)]$/;
  const match = value.match(rangePattern);
  
  if (!match) {
    // 检查是否是单值
    if (/^-?\d+\.?\d*$/.test(value)) {
      return { valid: true };
    }
    return { valid: false, message: '格式错误，请输入单值或区间如 (0,100]' };
  }
  
  const [, start, end] = match;
  
  // 验证数值范围
  if (start !== '-inf' && start !== 'inf' && end !== 'inf' && end !== '+inf' && end !== '-inf') {
    const startNum = parseFloat(start);
    const endNum = parseFloat(end);
    if (startNum >= endNum) {
      return { valid: false, message: '区间起始值必须小于结束值' };
    }
  }
  
  return { valid: true };
};

// 验证输出值类型匹配
export const validateOutputValue = (value: string, dataType: DataType): { valid: boolean; message?: string } => {
  if (!value) return { valid: true };
  
  switch (dataType) {
    case 'integer':
      if (!/^-?\d+$/.test(value)) {
        return { valid: false, message: '请输入整数' };
      }
      break;
    case 'decimal':
      if (!/^-?\d+\.?\d*$/.test(value)) {
        return { valid: false, message: '请输入数值' };
      }
      break;
    case 'boolean':
      if (value !== 'true' && value !== 'false') {
        return { valid: false, message: '请选择 true 或 false' };
      }
      break;
  }
  
  return { valid: true };
};
