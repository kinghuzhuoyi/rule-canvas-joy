import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table } from 'lucide-react';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Welcome to Your App</h1>
        <p className="text-xl text-muted-foreground mb-8">Start building your amazing project here!</p>
        <Link to="/decision-table">
          <Button className="gap-2">
            <Table className="h-4 w-4" />
            打开决策表编辑器
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
