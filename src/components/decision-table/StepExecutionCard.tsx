import React from 'react';
import { PlanStep, ExecutionPlan } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  Play, 
  SkipForward, 
  Pause,
  Loader2,
  CheckCircle2,
  XCircle,
  MessageCircle
} from 'lucide-react';

interface StepExecutionCardProps {
  plan: ExecutionPlan;
  onContinue: () => void;
  onSkip: () => void;
  onPause: () => void;
  disabled?: boolean;
}

export const StepExecutionCard: React.FC<StepExecutionCardProps> = ({
  plan,
  onContinue,
  onSkip,
  onPause,
  disabled = false,
}) => {
  const currentStep = plan.steps[plan.currentStepIndex];
  const completedSteps = plan.steps.filter(s => 
    s.status === 'completed' || s.status === 'skipped'
  ).length;
  const progress = (completedSteps / plan.steps.length) * 100;

  const isRunning = currentStep?.status === 'running';
  const isWaitingInput = currentStep?.status === 'need_input';
  const isCompleted = plan.status === 'completed';
  const isPaused = plan.status === 'paused';

  return (
    <Card className="w-full max-w-md border-primary/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isRunning && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            {isWaitingInput && <MessageCircle className="w-4 h-4 text-amber-500" />}
            {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {!isRunning && !isWaitingInput && !isCompleted && (
              <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs text-primary font-bold">
                  {plan.currentStepIndex + 1}
                </span>
              </div>
            )}
            步骤 {plan.currentStepIndex + 1} / {plan.steps.length}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>

      <CardContent className="pb-3">
        {currentStep && (
          <div className="space-y-3">
            {/* 当前步骤标题 */}
            <div>
              <h4 className="font-medium text-sm">{currentStep.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentStep.description}
              </p>
            </div>

            {/* ReAct 展示 */}
            {(currentStep.thought || currentStep.action || currentStep.observation) && (
              <div className="space-y-2 pt-2 border-t border-border">
                {currentStep.thought && (
                  <div className="flex gap-2">
                    <span className="text-base flex-shrink-0">💭</span>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">思考</span>
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap">
                        {currentStep.thought}
                      </p>
                    </div>
                  </div>
                )}
                
                {currentStep.action && (
                  <div className="flex gap-2">
                    <span className="text-base flex-shrink-0">🔧</span>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">执行</span>
                      <p className="text-xs text-foreground/80">
                        {currentStep.action}
                      </p>
                    </div>
                  </div>
                )}
                
                {currentStep.observation && (
                  <div className="flex gap-2">
                    <span className="text-base flex-shrink-0">👁</span>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">结果</span>
                      <p className="text-xs text-foreground/80 whitespace-pre-wrap">
                        {currentStep.observation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 等待用户输入提示 */}
            {isWaitingInput && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-2">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⏳ 等待您的输入后继续执行...
                </p>
              </div>
            )}

            {/* 执行完成提示 */}
            {isCompleted && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-md p-2">
                <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  计划执行完成！
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {!isCompleted && (
        <CardFooter className="flex gap-2 pt-0">
          {isPaused ? (
            <Button
              size="sm"
              onClick={onContinue}
              disabled={disabled}
              className="flex-1 gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              继续执行
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onPause}
                disabled={disabled || isRunning}
                className="gap-1.5"
              >
                <Pause className="w-3.5 h-3.5" />
                暂停
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSkip}
                disabled={disabled || isRunning}
                className="gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" />
                跳过
              </Button>
              {isWaitingInput && (
                <Button
                  size="sm"
                  onClick={onContinue}
                  disabled={disabled}
                  className="flex-1 gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  继续
                </Button>
              )}
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
