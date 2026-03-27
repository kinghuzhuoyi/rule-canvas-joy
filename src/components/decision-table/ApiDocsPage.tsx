import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, ChevronRight, ChevronDown, ExternalLink, Key, Eye, EyeOff, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BASE_URL_HINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/decision-table-api`;

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  requestBody?: string;
  responseBody: string;
  pathParams?: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  POST: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  PUT: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  DELETE: 'bg-red-500/15 text-red-700 border-red-500/30',
};

const ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/decision-tables',
    title: '创建决策表',
    description: '创建一个新的决策表，包含元信息、列定义和规则。',
    requestBody: `{
  "code": "DT_RATE_001",
  "name": "利率判断表",
  "description": "根据产品和评分等级确定利率",
  "notes": "",
  "columns": [
    { "id": "col_1", "name": "product_id", "dataType": "string", "isInput": true },
    { "id": "col_2", "name": "score_level", "dataType": "string", "isInput": true },
    { "id": "col_3", "name": "rate", "dataType": "decimal", "isInput": false }
  ],
  "rules": [
    { "id": "rule_1", "cells": { "col_1": "sZ0101", "col_2": "L5", "col_3": "0.0150" } },
    { "id": "rule_2", "cells": { "col_1": "sZ0101", "col_2": "L4", "col_3": "0.0388" } }
  ]
}`,
    responseBody: `{
  "id": "uuid",
  "code": "DT_RATE_001",
  "name": "利率判断表",
  "columns": [...],
  "rules": [...],
  "created_at": "2026-03-26T..."
}`,
  },
  {
    method: 'GET',
    path: '/decision-tables',
    title: '获取决策表列表',
    description: '分页查询所有决策表的摘要信息。支持 page 和 page_size 参数。',
    responseBody: `{
  "data": [
    { "id": "uuid", "code": "DT_RATE_001", "name": "利率判断表", "description": "...", "created_at": "...", "updated_at": "..." }
  ],
  "total": 5,
  "page": 1,
  "page_size": 20
}`,
  },
  {
    method: 'GET',
    path: '/decision-tables/{id}',
    title: '获取决策表详情',
    description: '根据 ID 获取完整的决策表数据，包括列、规则和备注。',
    pathParams: 'id: 决策表 UUID',
    responseBody: `{
  "id": "uuid",
  "code": "DT_RATE_001",
  "name": "利率判断表",
  "columns": [...],
  "rules": [...],
  "notes": "...",
  "created_at": "...",
  "updated_at": "..."
}`,
  },
  {
    method: 'PUT',
    path: '/decision-tables/{id}',
    title: '更新决策表',
    description: '更新指定决策表的任意字段（部分更新）。',
    pathParams: 'id: 决策表 UUID',
    requestBody: `{
  "name": "利率判断表 v2",
  "rules": [...]
}`,
    responseBody: `{ "id": "uuid", "name": "利率判断表 v2", ... }`,
  },
  {
    method: 'DELETE',
    path: '/decision-tables/{id}',
    title: '删除决策表',
    description: '删除指定的决策表及其关联的所有测试用例。',
    pathParams: 'id: 决策表 UUID',
    responseBody: `{ "success": true }`,
  },
  {
    method: 'POST',
    path: '/decision-tables/{id}/execute',
    title: '执行决策',
    description: '传入输入条件，匹配规则并返回输出结果。输入 key 为列的 name 字段。',
    pathParams: 'id: 决策表 UUID',
    requestBody: `{
  "inputs": {
    "product_id": "sZ0101",
    "score_level": "L5"
  }
}`,
    responseBody: `{
  "matched": true,
  "matchedRuleId": "rule_1",
  "outputs": {
    "rate": "0.0150"
  }
}`,
  },
  {
    method: 'POST',
    path: '/decision-tables/{id}/test-cases',
    title: '创建测试用例',
    description: '为指定决策表批量创建测试用例。',
    pathParams: 'id: 决策表 UUID',
    requestBody: `{
  "cases": [
    {
      "name": "L5等级利率",
      "inputs": { "product_id": "sZ0101", "score_level": "L5" },
      "expectedOutputs": { "rate": "0.0150" }
    }
  ]
}`,
    responseBody: `[{ "id": "uuid", "table_id": "uuid", "name": "L5等级利率", ... }]`,
  },
  {
    method: 'GET',
    path: '/decision-tables/{id}/test-cases',
    title: '获取测试用例',
    description: '查询指定决策表的所有测试用例。',
    pathParams: 'id: 决策表 UUID',
    responseBody: `[{ "id": "uuid", "name": "L5等级利率", "inputs": {...}, "expected_outputs": {...} }]`,
  },
  {
    method: 'POST',
    path: '/decision-tables/{id}/test-cases/run',
    title: '执行测试',
    description: '批量执行指定决策表的所有测试用例，返回每条用例的通过/失败状态。',
    pathParams: 'id: 决策表 UUID',
    responseBody: `{
  "summary": { "total": 5, "passed": 4, "failed": 1, "noMatch": 0 },
  "results": [
    { "id": "uuid", "name": "L5等级利率", "status": "passed", "actualOutputs": { "rate": "0.0150" } }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/variables',
    title: '获取变量列表',
    description: '查询所有已维护的变量定义，包含编码、名称和数据类型。变量可作为决策表的输入列来源。',
    responseBody: `[
  {
    "id": "uuid",
    "code": "product_id",
    "name": "产品ID",
    "data_type": "string",
    "description": "",
    "created_at": "...",
    "updated_at": "..."
  }
]`,
  },
  {
    method: 'GET',
    path: '/available-inputs?exclude_table_id={id}',
    title: '获取可用输入列表',
    description: '获取决策表配置时可选择的所有输入来源，包括：1) 已维护的变量；2) 其他决策表的输出列。可通过 exclude_table_id 排除当前决策表的输出。',
    responseBody: `{
  "variables": [
    { "id": "var_uuid", "name": "product_id", "label": "产品ID", "dataType": "string", "group": "variable" }
  ],
  "outputs": [
    { "id": "output_uuid_col_2", "name": "model_cust.score_level", "label": "模型分分箱 → score_level", "dataType": "string", "group": "output", "sourceTable": "model_cust" }
  ]
}`,
  },
];

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast.success('已复制到剪贴板');
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        <Copy className="w-3 h-3" />
      </Button>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors rounded-lg cursor-pointer">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          <Badge variant="outline" className={cn('text-[10px] font-mono px-2 py-0 shrink-0', METHOD_COLORS[endpoint.method])}>
            {endpoint.method}
          </Badge>
          <code className="text-xs font-mono text-foreground/80">{endpoint.path}</code>
          <span className="text-xs text-muted-foreground ml-auto">{endpoint.title}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pl-11 space-y-3">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          {endpoint.pathParams && (
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-1">路径参数</p>
              <code className="text-xs bg-muted/40 px-2 py-1 rounded">{endpoint.pathParams}</code>
            </div>
          )}
          {endpoint.requestBody && (
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-1">请求体</p>
              <CodeBlock code={endpoint.requestBody} />
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-foreground/70 mb-1">响应</p>
            <CodeBlock code={endpoint.responseBody} />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ApiDocsPageProps {
  className?: string;
}

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ className }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('api_keys').select('key').eq('is_active', true).limit(1).maybeSingle();
        if (data) setApiKey(data.key);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API Key 已复制');
    }
  };

  const downloadMarkdown = () => {
    const lines: string[] = [];
    lines.push('# 决策表 Open API\n');
    lines.push('以下接口开放给外部系统调用，支持决策表的完整生命周期管理。\n');
    lines.push('## 接入信息\n');
    lines.push(`- **Base URL**: \`${BASE_URL_HINT}\``);
    lines.push('- **认证方式**: 所有请求须在 Header 中携带 `x-api-key`\n');
    lines.push('### 请求示例\n');
    lines.push('```bash');
    lines.push(`curl -X GET "${BASE_URL_HINT}/decision-tables" \\`);
    lines.push('  -H "x-api-key: YOUR_API_KEY" \\');
    lines.push('  -H "Content-Type: application/json"');
    lines.push('```\n');
    lines.push('## 接口列表\n');
    ENDPOINTS.forEach((ep) => {
      lines.push(`### ${ep.method} \`${ep.path}\` — ${ep.title}\n`);
      lines.push(`${ep.description}\n`);
      if (ep.pathParams) {
        lines.push(`**路径参数**: \`${ep.pathParams}\`\n`);
      }
      if (ep.requestBody) {
        lines.push('**请求体**:\n```json');
        lines.push(ep.requestBody);
        lines.push('```\n');
      }
      lines.push('**响应**:\n```json');
      lines.push(ep.responseBody);
      lines.push('```\n');
    });
    lines.push('## 数据模型\n');
    lines.push('### Column 列定义\n```json\n{\n  "id": "col_1",\n  "name": "product_id",\n  "dataType": "string",\n  "isInput": true,\n  "variableId": "var_1"\n}\n```\n');
    lines.push('### Rule 规则\n```json\n{\n  "id": "rule_1",\n  "cells": {\n    "col_1": "sZ0101",\n    "col_2": "L5",\n    "col_3": "0.0150"\n  }\n}\n```\n');
    lines.push('输入条件支持：精确值、区间 `(0,100]`、通配 `""` / `"-"` / `"*"`\n');

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decision-table-openapi.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('文档已下载');
  };

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">决策表 Open API</h1>
            <p className="text-sm text-muted-foreground mt-1">
              以下接口开放给外部系统调用，支持决策表的完整生命周期管理。
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadMarkdown}>
            <Download className="w-3.5 h-3.5" />
            下载文档
          </Button>
        </div>

        {/* Base URL & Auth */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">接入信息</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Base URL</p>
              <CodeBlock code={BASE_URL_HINT} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">认证方式</p>
              <p className="text-sm">所有请求须在 Header 中携带 <code className="bg-muted/50 px-1.5 py-0.5 rounded text-xs">x-api-key</code></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">API Key</p>
              {loading ? (
                <div className="h-8 bg-muted/30 rounded animate-pulse" />
              ) : apiKey ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted/50 px-2 py-1.5 rounded flex-1 font-mono">
                    {showKey ? apiKey : '•'.repeat(32)}
                  </code>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyApiKey}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">未找到有效的 API Key</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">请求示例</p>
              <CodeBlock code={`curl -X GET "${BASE_URL_HINT}/decision-tables" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`} language="bash" />
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">接口列表</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <div className="divide-y divide-border/50">
              {ENDPOINTS.map((ep, i) => (
                <EndpointCard key={i} endpoint={ep} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data model */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">数据模型</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-1">Column 列定义</p>
              <CodeBlock code={`{
  "id": "col_1",          // 列唯一标识
  "name": "product_id",   // 列名（用于输入/输出的 key）
  "dataType": "string",   // 数据类型: string | integer | decimal | boolean
  "isInput": true,        // true=输入列, false=输出列
  "variableId": "var_1"   // 关联变量ID（仅输入列）
}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground/70 mb-1">Rule 规则</p>
              <CodeBlock code={`{
  "id": "rule_1",
  "cells": {
    "col_1": "sZ0101",    // 输入条件或输出值
    "col_2": "L5",        // 字符串精确匹配
    "col_3": "0.0150"     // 输出值
  }
}

// 输入条件支持:
// - 精确值: "sZ0101"
// - 区间: "(0,100]", "[-inf,50)"
// - 通配: "" 或 "-" 或 "*"（匹配任意值）`} />
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
