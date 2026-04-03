

# 新增"规则"和"脚本"组件类型

## 概述

在现有决策表工作区中新增两种组件类型：**规则（Rule Component）** 和 **脚本（Script Component）**，与决策表并列管理。三种组件共享统一的标签栏、测试面板、备注、元信息编辑和数据库持久化架构。

## 数据架构

### 数据库

新建一张通用的 `components` 表（或扩展现有 `decision_tables` 表增加 `type` 字段）。推荐方案：**在 `decision_tables` 表增加 `type` 列**，值为 `decision_table` / `rule` / `script`，默认 `decision_table`，向后兼容现有数据。

同时增加一个 `config` JSONB 列，存储各类型特有的配置：
- **规则组件**：存储条件树结构（AND/OR 分组 + 三元表达式节点）
- **脚本组件**：存储输出定义列表 + 脚本代码

```text
decision_tables 表新增字段：
  type    text  DEFAULT 'decision_table'
  config  jsonb DEFAULT '{}'
```

### TypeScript 类型

```text
ComponentType = 'decision_table' | 'rule' | 'script'

// 规则组件 - 条件树
ConditionNode = {
  type: 'group' | 'condition'
  operator?: 'and' | 'or'          // group 时
  children?: ConditionNode[]        // group 时
  leftInput?: string               // condition 时 (变量/组件输出引用)
  comparator?: string              // >, <, ==, >=, <=, contains, in 等
  rightValue?: string              // 右侧值
}

RuleComponentConfig = {
  conditionTree: ConditionNode
}

// 脚本组件 - 输出定义 + 代码
ScriptOutput = { code: string; name: string; dataType: DataType }
ScriptComponentConfig = {
  outputs: ScriptOutput[]
  script: string                    // Aviator 语法代码
}
```

## 实现步骤

### 第 1 步：数据库迁移
- `decision_tables` 表增加 `type` 和 `config` 列
- 现有数据 `type` 默认为 `decision_table`

### 第 2 步：扩展 Context 和类型系统
- 更新 `DecisionTableState` 增加 `type` 和 `config` 字段
- 更新 `createTable` 支持传入组件类型
- 更新数据库加载/保存逻辑兼容新字段
- 标签栏新增按钮支持创建三种类型的组件

### 第 3 步：更新标签栏（TableTabBar）
- "+" 按钮改为下拉菜单，提供"决策表"、"规则"、"脚本"三个选项
- 标签上显示组件类型图标区分（Table2 / Shield / Code）

### 第 4 步：创建规则编辑器（RuleEditor）
核心交互组件，包含：
- **条件树构建器**：可视化配置 AND/OR 分组，支持嵌套。每个分组可添加子条件或子分组，通过按钮切换 AND/OR
- **条件行**：三列布局 — 左侧下拉选择输入（变量/组件输出），中间下拉选择比较符（根据数据类型动态显示），右侧输入值
- 整体样式参考决策表的表格风格，使用相同的 card/border/muted 配色

### 第 5 步：创建脚本编辑器（ScriptEditor）
包含两部分：
- **输出定义区**：表格形式管理输出字段（编码、名称、类型），支持增删改
- **代码编辑区**：textarea 代码编辑器，支持输入变量和内置函数的自动联想（使用简单的下拉提示实现）

### 第 6 步：创建统一的组件面板（ComponentPanel）
替换或扩展现有 `DecisionTablePanel`，根据 `type` 渲染不同的编辑器：
- `decision_table` → 现有 `DecisionTableEditor`
- `rule` → 新的 `RuleEditor`
- `script` → 新的 `ScriptEditor`
三种类型共享：元信息编辑器、备注 Tab、测试 Tab

### 第 7 步：规则/脚本的测试执行引擎
- **规则测试**：给定输入值，对条件树求值返回 `true/false`
- **脚本测试**：给定输入值，执行 Aviator 风格脚本（在前端使用安全的表达式求值），返回输出值
- 复用现有 `TestPanel` 组件，适配不同组件类型的输入/输出结构

### 第 8 步：输入引用更新
- 规则和脚本的输入选择器复用现有的变量/组件输出引用逻辑
- 脚本的输出可被其他组件引用（格式：`脚本编码.输出编码`）
- 规则的输出固定为 `boolean`（格式：`规则编码.result`）

## 文件变更清单

| 文件 | 操作 |
|------|------|
| 数据库迁移（type + config 列） | 新建 |
| `src/components/decision-table/types.ts` | 修改 - 增加新类型定义 |
| `src/contexts/DecisionTableContext.tsx` | 修改 - 支持组件类型 |
| `src/components/decision-table/TableTabBar.tsx` | 修改 - 多类型创建菜单 |
| `src/components/decision-table/RuleEditor.tsx` | 新建 - 规则条件树编辑器 |
| `src/components/decision-table/ConditionTreeBuilder.tsx` | 新建 - 条件树可视化组件 |
| `src/components/decision-table/ScriptEditor.tsx` | 新建 - 脚本编辑器 |
| `src/components/decision-table/ScriptOutputDefiner.tsx` | 新建 - 脚本输出定义 |
| `src/components/decision-table/ComponentPanel.tsx` | 新建 - 统一面板路由 |
| `src/components/decision-table/ruleEngine.ts` | 修改 - 增加规则/脚本执行逻辑 |
| `src/components/decision-table/DecisionTablePanel.tsx` | 修改 - 集成组件类型判断 |

