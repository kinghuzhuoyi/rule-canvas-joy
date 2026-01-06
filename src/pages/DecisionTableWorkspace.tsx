import React from 'react';
import { DecisionTableProvider } from '@/contexts/DecisionTableContext';
import { TableTabBar } from '@/components/decision-table/TableTabBar';
import { GlobalAIChat } from '@/components/decision-table/GlobalAIChat';
import { DecisionTablePanel } from '@/components/decision-table/DecisionTablePanel';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

const DecisionTableWorkspace: React.FC = () => {
  return (
    <DecisionTableProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* 顶部标签栏 */}
        <TableTabBar className="h-10 shrink-0" />
        
        {/* 主体区域 */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* 左侧全局 AI 助手 */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
            <GlobalAIChat className="h-full border-r border-border" />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* 右侧当前表编辑区 */}
          <ResizablePanel defaultSize={70} minSize={45}>
            <DecisionTablePanel className="h-full" />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </DecisionTableProvider>
  );
};

export default DecisionTableWorkspace;
