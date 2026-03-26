import React, { useState } from 'react';
import { DecisionTableProvider } from '@/contexts/DecisionTableContext';
import { TableTabBar } from '@/components/decision-table/TableTabBar';
import { GlobalAIChat } from '@/components/decision-table/GlobalAIChat';
import { DecisionTablePanel } from '@/components/decision-table/DecisionTablePanel';
import { ApiDocsPage } from '@/components/decision-table/ApiDocsPage';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

const DecisionTableWorkspace: React.FC = () => {
  const [showApiDocs, setShowApiDocs] = useState(false);

  return (
    <DecisionTableProvider>
      <div className="h-screen flex flex-col bg-background">
        <TableTabBar
          className="h-10 shrink-0"
          showApiDocs={showApiDocs}
          onToggleApiDocs={() => setShowApiDocs(prev => !prev)}
        />
        
        {showApiDocs ? (
          <ApiDocsPage className="flex-1" />
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
              <GlobalAIChat className="h-full border-r border-border" />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70} minSize={45}>
              <DecisionTablePanel className="h-full" />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </DecisionTableProvider>
  );
};

export default DecisionTableWorkspace;
