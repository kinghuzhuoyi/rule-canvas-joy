import React from 'react';
import { PlanStep, PlanStepStatus } from '@/services/aiService';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  SkipForward, 
  XCircle,
  MessageCircle,
  ChevronRight
} from 'lucide-react';

interface PlanStepCardProps {
  step: PlanStep;
  isActive: boolean;
  showDetails?: boolean;
}

const statusConfig: Record<PlanStepStatus, { 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
}> = {
  pending: { 
    icon: <Circle className="w-4 h-4" />, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50'
  },
  running: { 
    icon: <Loader2 className="w-4 h-4 animate-spin" />, 
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  completed: { 
    icon: <CheckCircle2 className="w-4 h-4" />, 
    color: 'text-green-600 dark:text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30'
  },
  skipped: { 
    icon: <SkipForward className="w-4 h-4" />, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30'
  },
  failed: { 
    icon: <XCircle className="w-4 h-4" />, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10'
  },
  need_input: { 
    icon: <MessageCircle className="w-4 h-4" />, 
    color: 'text-amber-600 dark:text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30'
  },
};

export const PlanStepCard: React.FC<PlanStepCardProps> = ({
  step,
  isActive,
  showDetails = false,
}) => {
  const config = statusConfig[step.status];

  return (
    <div className={cn(
      "rounded-lg border transition-all duration-200",
      isActive ? "border-primary shadow-sm" : "border-border",
      config.bgColor
    )}>
      {/* 步骤头部 */}
      <div className={cn(
        "flex items-center gap-3 px-3 py-2",
        isActive && "font-medium"
      )}>
        <div className={cn("flex-shrink-0", config.color)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              步骤 {step.index + 1}
            </span>
            {isActive && (
              <ChevronRight className="w-3 h-3 text-primary animate-pulse" />
            )}
          </div>
          <div className="text-sm truncate">{step.title}</div>
        </div>
      </div>

      {/* 步骤详情（Thought/Action/Observation） */}
      {showDetails && (step.thought || step.action || step.observation) && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50">
          {step.thought && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">💭 思考：</span>
              <p className="mt-0.5 text-foreground/80 whitespace-pre-wrap">{step.thought}</p>
            </div>
          )}
          {step.action && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">🔧 执行：</span>
              <p className="mt-0.5 text-foreground/80">{step.action}</p>
            </div>
          )}
          {step.observation && (
            <div className="text-xs">
              <span className="font-medium text-muted-foreground">👁 结果：</span>
              <p className="mt-0.5 text-foreground/80 whitespace-pre-wrap">{step.observation}</p>
            </div>
          )}
        </div>
      )}

      {/* 描述（仅在非详情模式下显示） */}
      {!showDetails && step.description && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {step.description}
          </p>
        </div>
      )}
    </div>
  );
};
