import { Column, TestCase, generateId } from './types';

// 解析粘贴的表格数据
export function parseTableData(
  rawData: string,
  columns: Column[]
): { cases: TestCase[]; errors: string[] } {
  const cases: TestCase[] = [];
  const errors: string[] = [];
  
  const lines = rawData.trim().split('\n');
  if (lines.length < 2) {
    errors.push('至少需要一行表头和一行数据');
    return { cases, errors };
  }
  
  // 第一行作为列头
  const headers = lines[0].split('\t').map(h => h.trim());
  
  // 匹配列头到 column
  const columnMap = mapHeadersToColumns(headers, columns);
  
  if (Object.keys(columnMap).length === 0) {
    errors.push('未能匹配任何列，请检查表头名称是否与决策表列名一致');
    return { cases, errors };
  }
  
  // 解析数据行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split('\t');
    const testCase = createTestCaseFromValues(values, columnMap, columns, headers);
    cases.push(testCase);
  }
  
  return { cases, errors };
}

// 将表头映射到列
function mapHeadersToColumns(
  headers: string[],
  columns: Column[]
): Record<number, Column> {
  const map: Record<number, Column> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    
    // 尝试匹配列名
    const matchedColumn = columns.find(col => 
      col.name.toLowerCase() === normalizedHeader ||
      col.id.toLowerCase() === normalizedHeader
    );
    
    if (matchedColumn) {
      map[index] = matchedColumn;
    }
  });
  
  return map;
}

// 从值创建测试用例
function createTestCaseFromValues(
  values: string[],
  columnMap: Record<number, Column>,
  columns: Column[],
  headers: string[]
): TestCase {
  const inputs: Record<string, string> = {};
  const expectedOutputs: Record<string, string> = {};
  
  Object.entries(columnMap).forEach(([indexStr, column]) => {
    const index = parseInt(indexStr);
    const value = values[index]?.trim() || '';
    
    if (column.isInput) {
      inputs[column.id] = value;
    } else {
      expectedOutputs[column.id] = value;
    }
  });
  
  // 生成用例名称（使用输入值的前几个）
  const inputColumns = columns.filter(c => c.isInput);
  const nameParts = inputColumns
    .slice(0, 2)
    .map(c => inputs[c.id] || '-')
    .join(', ');
  
  return {
    id: generateId(),
    name: nameParts || `用例 ${Date.now()}`,
    inputs,
    expectedOutputs,
    status: 'pending',
  };
}

// 生成导入模板提示
export function generateTemplateHint(columns: Column[]): string {
  const inputCols = columns.filter(c => c.isInput);
  const outputCols = columns.filter(c => !c.isInput);
  
  const allCols = [...inputCols, ...outputCols];
  const headers = allCols.map(c => c.name).join('\t');
  const example = allCols.map(c => {
    if (c.dataType === 'boolean') return 'true';
    if (c.dataType === 'integer') return '100';
    if (c.dataType === 'decimal') return '99.9';
    return '示例值';
  }).join('\t');
  
  return `${headers}\n${example}`;
}
