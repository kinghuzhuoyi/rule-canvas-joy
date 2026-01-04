import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Edit2 } from 'lucide-react';

interface RequirementConfirmCardProps {
  onConfirm: () => void;
  onRequestChange: () => void;
  disabled?: boolean;
}

export const RequirementConfirmCard: React.FC<RequirementConfirmCardProps> = ({
  onConfirm,
  onRequestChange,
  disabled = false,
}) => {
  return (
    <Card className="bg-muted/50 border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={onConfirm}
            disabled={disabled}
            size="sm"
            className="gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            确认生成
          </Button>
          <Button
            onClick={onRequestChange}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            需要修改
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
