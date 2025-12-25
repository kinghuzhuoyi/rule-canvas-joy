import React from 'react';
import { DecisionTableEditor } from '@/components/decision-table';

const DecisionTable: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">决策表编辑器演示</h1>
          <p className="text-muted-foreground mt-1">
            支持拖拽排序、圈选复制、Excel导入导出等功能
          </p>
        </div>
        
        <DecisionTableEditor
          className="min-h-[500px]"
          onChange={data => {
            console.log('Decision table data changed:', data);
          }}
        />
        
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h2 className="font-semibold text-foreground mb-2">使用说明</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>添加输入列</strong>：点击输入区域的 + 按钮，搜索并选择变量</li>
            <li>• <strong>添加输出列</strong>：点击输出区域的 + 按钮，输入列名并选择数据类型</li>
            <li>• <strong>编辑列</strong>：点击列标题旁的编辑图标</li>
            <li>• <strong>删除列</strong>：悬停在列标题上，点击删除按钮</li>
            <li>• <strong>拖拽排序</strong>：使用左侧拖拽手柄 ☰ 上下移动规则行</li>
            <li>• <strong>圈选单元格</strong>：鼠标拖拽选择多个单元格</li>
            <li>• <strong>快捷键</strong>：Ctrl+C 复制 / Ctrl+V 粘贴 / Delete 删除选中内容</li>
            <li>• <strong>数值区间</strong>：支持区间语法如 (0,100]、[-inf,0)、(596,+inf)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DecisionTable;
