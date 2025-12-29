import React from 'react';
import { DecisionTableComponent } from '@/components/decision-table';

const DecisionTable: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)]">
        <DecisionTableComponent
          onChange={data => {
            console.log('Decision table data changed:', data);
          }}
        />
      </div>
    </div>
  );
};

export default DecisionTable;
