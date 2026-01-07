import React from 'react';
import { ExecutionPlan } from '@/services/aiService';
import { PlanStepCard } from './PlanStepCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, Play, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanConfirmCardProps {
  plan: ExecutionPlan;
  onConfirm: () => void;
  onModify: () => void;
  disabled?: boolean;
}

export const PlanConfirmCard: React.FC<PlanConfirmCardProps> = ({
  plan,
  onConfirm,
  onModify,
  disabled = false,
}) => {
  return (
    <Card className="w-full max-w-md border-primary/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" />
          执行计划
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {plan.goal}
        </p>
      </CardHeader>
      
      <CardContent className="pb-3">
        <ScrollArea className={cn(
          plan.steps.length > 4 ? "h-[240px]" : "h-auto"
        )}>
          <div className="space-y-2 pr-2">
            {plan.steps.map((step, index) => (
              <PlanStepCard
                key={step.id}
                step={step}
                isActive={index === 0}
                showDetails={false}
              />
            ))}
          </div>
        </ScrollArea>
        
        <p className="text-xs text-muted-foreground mt-3 text-center">
          共 {plan.steps.length} 个步骤
        </p>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onModify}
          disabled={disabled}
          className="flex-1 gap-1.5"
        >
          <Pencil className="w-3.5 h-3.5" />
          修改计划
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={disabled}
          className="flex-1 gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          开始执行
        </Button>
      </CardFooter>
    </Card>
  );
};
