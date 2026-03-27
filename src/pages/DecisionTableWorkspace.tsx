import React, { useState } from 'react';
import { DecisionTableProvider } from '@/contexts/DecisionTableContext';
import { TableTabBar } from '@/components/decision-table/TableTabBar';
import { GlobalAIChat } from '@/components/decision-table/GlobalAIChat';
import { DecisionTablePanel } from '@/components/decision-table/DecisionTablePanel';
import { ApiDocsPage } from '@/components/decision-table/ApiDocsPage';
import { VariableManagerPanel } from '@/components/decision-table/VariableManagerPanel';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

const DecisionTableWorkspace: React.FC = () => {
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [showVariableManager, setShowVariableManager] = useState(false);

  const handleToggleApiDocs = () => {
    setShowApiDocs(prev => !prev);
    if (!showApiDocs) setShowVariableManager(false);
  };

  const handleToggleVariableManager = () => {
    setShowVariableManager(prev => !prev);
    if (!showVariableManager) setShowApiDocs(false);
  };

  return (
    <DecisionTableProvider>
      <div className="h-screen flex flex-col bg-background">
        <TableTabBar
          className="h-10 shrink-0"
          showApiDocs={showApiDocs}
          onToggleApiDocs={handleToggleApiDocs}
          showVariableManager={showVariableManager}
          onToggleVariableManager={handleToggleVariableManager}
        />
        
        {showApiDocs ? (
          <ApiDocsPage className="flex-1" />
        ) : showVariableManager ? (
          <VariableManagerPanel
            className="flex-1"
            onClose={() => setShowVariableManager(false)}
          />
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
