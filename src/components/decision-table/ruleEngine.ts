import { Column, Rule, DataType, ConditionNode, RuleComponentConfig, ScriptComponentConfig } from './types';

// 解析区间表达式
interface RangeExpression {
  type: 'single' | 'range' | 'any';
  value?: number | string;
  start?: number;
  end?: number;
  startInclusive?: boolean;
  endInclusive?: boolean;
}

export function parseRangeExpression(expr: string, dataType: DataType): RangeExpression {
  if (!expr || expr.trim() === '' || expr === '-' || expr === '*') {
    return { type: 'any' };
  }
  
  const trimmed = expr.trim();
  
  // 检查是否是区间表达式 (0,100] 或 [-inf,50)
  const rangePattern = /^([\[\(])(-?inf|-?\d+\.?\d*),\s*(-?inf|\+?inf|-?\d+\.?\d*)([\]\)])$/;
  const match = trimmed.match(rangePattern);
  
  if (match) {
    const [, startBracket, startVal, endVal, endBracket] = match;
    
    const start = startVal === '-inf' ? -Infinity : parseFloat(startVal);
    const end = endVal === '+inf' || endVal === 'inf' ? Infinity : parseFloat(endVal);
    
    return {
      type: 'range',
      start,
      end,
      startInclusive: startBracket === '[',
      endInclusive: endBracket === ']',
    };
  }
  
  // 单值
  if (dataType === 'integer' || dataType === 'decimal') {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return { type: 'single', value: num };
    }
  }
  
  // 字符串或布尔值
  return { type: 'single', value: trimmed };
}

// 判断输入值是否匹配规则条件
export function matchesCondition(inputValue: unknown, condition: unknown, dataType: DataType): boolean {
  const cond =
    typeof condition === 'string'
      ? condition
      : condition === null || condition === undefined
        ? ''
        : String(condition);

  if (!cond || cond.trim() === '' || cond === '-' || cond === '*') {
    return true; // 空条件匹配任意值
  }

  const iv =
    typeof inputValue === 'string'
      ? inputValue
      : inputValue === null || inputValue === undefined
        ? ''
        : String(inputValue);

  if (!iv || iv.trim() === '') {
    return false; // 没有输入值则不匹配
  }

  const parsed = parseRangeExpression(cond, dataType);

  if (parsed.type === 'any') {
    return true;
  }

  if (parsed.type === 'range') {
    const numValue = parseFloat(iv);
    if (isNaN(numValue)) return false;

    const { start, end, startInclusive, endInclusive } = parsed;
    const startOk = startInclusive ? numValue >= start! : numValue > start!;
    const endOk = endInclusive ? numValue <= end! : numValue < end!;

    return startOk && endOk;
  }

  // 单值匹配
  if (dataType === 'boolean') {
    return iv.toLowerCase() === String(parsed.value).toLowerCase();
  }

  if (dataType === 'integer' || dataType === 'decimal') {
    return parseFloat(iv) === parsed.value;
  }

  // 字符串比较
  return iv === parsed.value;
}

// 匹配规则
export interface MatchResult {
  matched: boolean;
  rule: Rule | null;
  outputs: Record<string, string>;
}

export function findMatchingRule(
  inputs: Record<string, string>,
  columns: Column[],
  rules: Rule[]
): MatchResult {
  const inputColumns = columns.filter(c => c.isInput);
  const outputColumns = columns.filter(c => !c.isInput);

  const normalRules = rules.filter(r => !r.isFallback);
  const fallbackRule = rules.find(r => r.isFallback);

  for (const rule of normalRules) {
    let allMatch = true;
    for (const col of inputColumns) {
      const inputValue = inputs[col.id] || '';
      const condition = rule.cells[col.id] || '';
      if (!matchesCondition(inputValue, condition, col.dataType)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      const outputs: Record<string, string> = {};
      for (const col of outputColumns) {
        outputs[col.id] = rule.cells[col.id] || '';
      }
      return { matched: true, rule, outputs };
    }
  }

  if (fallbackRule) {
    const outputs: Record<string, string> = {};
    for (const col of outputColumns) {
      outputs[col.id] = fallbackRule.cells[col.id] || '';
    }
    return { matched: true, rule: fallbackRule, outputs };
  }

  return { matched: false, rule: null, outputs: {} };
}


// 比较预期输出与实际输出
export function compareOutputs(
  expected: Record<string, string>,
  actual: Record<string, string>,
  columns: Column[]
): { passed: boolean; details: Record<string, { expected: string; actual: string; match: boolean }> } {
  const outputColumns = columns.filter(c => !c.isInput);
  const details: Record<string, { expected: string; actual: string; match: boolean }> = {};
  let allMatch = true;
  
  for (const col of outputColumns) {
    const expectedVal = expected[col.id] || '';
    const actualVal = actual[col.id] || '';
    
    let match = false;
    if (!expectedVal) {
      match = true;
    } else if (col.dataType === 'integer' || col.dataType === 'decimal') {
      match = parseFloat(expectedVal) === parseFloat(actualVal);
    } else {
      match = expectedVal === actualVal;
    }
    
    details[col.id] = { expected: expectedVal, actual: actualVal, match };
    if (!match && expectedVal) {
      allMatch = false;
    }
  }
  
  return { passed: allMatch, details };
}

// ===== 规则组件执行 =====

function evaluateConditionNode(node: ConditionNode, inputs: Record<string, unknown>): boolean {
  if (node.type === 'condition') {
    const leftKey = node.leftInput || '';
    const leftValue = inputs[leftKey];
    const rightValue = node.rightValue || '';
    const comparator = node.comparator || '==';

    const leftStr = leftValue === null || leftValue === undefined ? '' : String(leftValue);

    switch (comparator) {
      case '==': return leftStr === rightValue;
      case '!=': return leftStr !== rightValue;
      case '>': return parseFloat(leftStr) > parseFloat(rightValue);
      case '>=': return parseFloat(leftStr) >= parseFloat(rightValue);
      case '<': return parseFloat(leftStr) < parseFloat(rightValue);
      case '<=': return parseFloat(leftStr) <= parseFloat(rightValue);
      case 'contains': return leftStr.includes(rightValue);
      case 'not_contains': return !leftStr.includes(rightValue);
      case 'starts_with': return leftStr.startsWith(rightValue);
      case 'ends_with': return leftStr.endsWith(rightValue);
      case 'in': {
        const list = rightValue.split(',').map(s => s.trim());
        return list.includes(leftStr);
      }
      default: return leftStr === rightValue;
    }
  }

  if (node.type === 'group' && node.children) {
    if (node.operator === 'or') {
      return node.children.some(c => evaluateConditionNode(c, inputs));
    }
    // default AND
    return node.children.every(c => evaluateConditionNode(c, inputs));
  }

  return false;
}

export function evaluateRuleComponent(
  config: RuleComponentConfig,
  inputs: Record<string, unknown>
): { result: boolean } {
  if (!config?.conditionTree) return { result: false };
  return { result: evaluateConditionNode(config.conditionTree, inputs) };
}

// ===== 脚本组件执行 =====

export function evaluateScriptComponent(
  config: ScriptComponentConfig,
  inputs: Record<string, unknown>
): Record<string, unknown> {
  if (!config?.script) return {};

  try {
    // Build a safe function from the script
    const inputKeys = Object.keys(inputs);
    const inputValues = Object.values(inputs);

    // Wrap the script in a function
    const fn = new Function(...inputKeys, config.script);
    const result = fn(...inputValues);

    // If script returns a single value and there's one output, map it
    if (config.outputs.length === 1 && typeof result !== 'object') {
      return { [config.outputs[0].code]: result };
    }

    // If result is an object, use it directly
    if (typeof result === 'object' && result !== null) {
      return result as Record<string, unknown>;
    }

    return { result };
  } catch (e) {
    console.error('Script execution error:', e);
    return { _error: String(e) };
  }
}
