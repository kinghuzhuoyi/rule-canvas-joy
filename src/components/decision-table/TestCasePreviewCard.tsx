import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlaskConical, Download, CheckCircle2, AlertTriangle, Target, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GeneratedTestCase {
  name: string;
  description?: string;
  category: 'normal' | 'boundary' | 'missing' | 'invalid';
  inputs: Record<string, string>;
  expectedOutputs?: Record<string, string>;
}

interface TestCasePreviewCardProps {
  testCases: GeneratedTestCase[];
  summary?: string;
  onImport: (cases: GeneratedTestCase[]) => void;
  isImported?: boolean;
}

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  normal: { 
    label: '常规用例', 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
    color: 'text-green-600' 
  },
  boundary: { 
    label: '边界值用例', 
    icon: <Target className="w-3.5 h-3.5" />, 
    color: 'text-blue-600' 
  },
  missing: { 
    label: '缺失值用例', 
    icon: <HelpCircle className="w-3.5 h-3.5" />, 
    color: 'text-amber-600' 
  },
  invalid: { 
    label: '无效值用例', 
    icon: <AlertTriangle className="w-3.5 h-3.5" />, 
    color: 'text-destructive' 
  },
};

export const TestCasePreviewCard: React.FC<TestCasePreviewCardProps> = ({
  testCases,
  summary,
  onImport,
  isImported = false,
}) => {
  // 按类别分组
  const groupedCases = testCases.reduce((acc, tc) => {
    const category = tc.category || 'normal';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tc);
    return acc;
  }, {} as Record<string, GeneratedTestCase[]>);

  const categoryOrder = ['normal', 'boundary', 'missing', 'invalid'];

  return (
    <Card className="w-full max-w-md border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FlaskConical className="w-4 h-4 text-primary" />
          已生成 {testCases.length} 个测试用例
        </CardTitle>
        {summary && (
          <p className="text-xs text-muted-foreground mt-1">{summary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-64">
          <div className="space-y-3 pr-2">
            {categoryOrder.map(category => {
              const cases = groupedCases[category];
              if (!cases || cases.length === 0) return null;
              
              const config = categoryConfig[category];
              
              return (
                <div key={category} className="space-y-1.5">
                  <div className={cn("flex items-center gap-1.5 text-xs font-medium", config.color)}>
                    {config.icon}
                    <span>{config.label} ({cases.length})</span>
                  </div>
                  <div className="space-y-1 pl-5">
                    {cases.map((tc, index) => (
                      <div 
                        key={index} 
                        className="text-xs text-muted-foreground py-1 border-l-2 border-border pl-2"
                      >
                        <span className="font-medium text-foreground">{tc.name}</span>
                        {tc.description && (
                          <span className="ml-1">— {tc.description}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Button
          onClick={() => onImport(testCases)}
          disabled={isImported}
          className="w-full gap-2"
          variant={isImported ? "secondary" : "default"}
        >
          {isImported ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              已导入到测试面板
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              导入到测试面板
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
