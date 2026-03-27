import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { DataType, DATA_TYPE_LABELS } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface ManagedVariable {
  id: string;
  code: string;
  name: string;
  dataType: DataType;
  description: string;
}

interface VariableManagerPanelProps {
  className?: string;
  onClose: () => void;
}

export const VariableManagerPanel: React.FC<VariableManagerPanelProps> = ({ className, onClose }) => {
  const { toast } = useToast();
  const [variables, setVariables] = useState<ManagedVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ code: '', name: '', dataType: 'string' as DataType, description: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({ code: '', name: '', dataType: 'string' as DataType, description: '' });

  const loadVariables = useCallback(async () => {
    const { data, error } = await supabase
      .from('variables')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      toast({ variant: 'destructive', description: '加载变量列表失败' });
      return;
    }
    
    setVariables((data || []).map(v => ({
      id: v.id,
      code: v.code,
      name: v.name,
      dataType: v.data_type as DataType,
      description: v.description || '',
    })));
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadVariables(); }, [loadVariables]);

  const handleAdd = async () => {
    if (!newForm.code.trim() || !newForm.name.trim()) {
      toast({ variant: 'destructive', description: '变量编码和名称不能为空' });
      return;
    }

    const { error } = await supabase.functions.invoke('decision-table-api', {
      body: {
        action: 'create_variable',
        code: newForm.code.trim(),
        name: newForm.name.trim(),
        data_type: newForm.dataType,
        description: newForm.description.trim(),
      },
    });

    if (error) {
      toast({ variant: 'destructive', description: '新增变量失败' });
      return;
    }

    toast({ description: '变量已新增' });
    setNewForm({ code: '', name: '', dataType: 'string', description: '' });
    setIsAdding(false);
    loadVariables();
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.code.trim() || !editForm.name.trim()) return;

    const { error } = await supabase.functions.invoke('decision-table-api', {
      body: {
        action: 'update_variable',
        id,
        code: editForm.code.trim(),
        name: editForm.name.trim(),
        data_type: editForm.dataType,
        description: editForm.description.trim(),
      },
    });

    if (error) {
      toast({ variant: 'destructive', description: '更新变量失败' });
      return;
    }

    toast({ description: '变量已更新' });
    setEditingId(null);
    loadVariables();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.functions.invoke('decision-table-api', {
      body: { action: 'delete_variable', id },
    });

    if (error) {
      toast({ variant: 'destructive', description: '删除变量失败' });
      return;
    }

    toast({ description: '变量已删除' });
    loadVariables();
  };

  const startEditing = (v: ManagedVariable) => {
    setEditingId(v.id);
    setEditForm({ code: v.code, name: v.name, dataType: v.dataType, description: v.description });
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <h2 className="font-semibold text-foreground">变量管理</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setIsAdding(true)}>
            <Plus className="h-3.5 w-3.5" />
            新增变量
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-8">加载中…</div>
        ) : (
          <div className="space-y-1">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_100px_1fr_80px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
              <span>编码</span>
              <span>名称</span>
              <span>类型</span>
              <span>描述</span>
              <span>操作</span>
            </div>

            {/* Add form */}
            {isAdding && (
              <div className="grid grid-cols-[1fr_1fr_100px_1fr_80px] gap-2 px-3 py-2 bg-primary/5 rounded-md items-center">
                <Input placeholder="编码" value={newForm.code} onChange={e => setNewForm(p => ({ ...p, code: e.target.value }))} className="h-7 text-sm" autoFocus />
                <Input placeholder="名称" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} className="h-7 text-sm" />
                <Select value={newForm.dataType} onValueChange={v => setNewForm(p => ({ ...p, dataType: v as DataType }))}>
                  <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DATA_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="描述（可选）" value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))} className="h-7 text-sm" />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAdd}><Save className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAdding(false)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}

            {/* Variable rows */}
            {variables.map(v => (
              editingId === v.id ? (
                <div key={v.id} className="grid grid-cols-[1fr_1fr_100px_1fr_80px] gap-2 px-3 py-2 bg-accent/30 rounded-md items-center">
                  <Input value={editForm.code} onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))} className="h-7 text-sm" />
                  <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="h-7 text-sm" />
                  <Select value={editForm.dataType} onValueChange={v => setEditForm(p => ({ ...p, dataType: v as DataType }))}>
                    <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DATA_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="h-7 text-sm" />
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(v.id)}><Save className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
                <div key={v.id} className="group grid grid-cols-[1fr_1fr_100px_1fr_80px] gap-2 px-3 py-2 rounded-md hover:bg-accent/20 items-center text-sm">
                  <span className="font-mono text-xs">{v.code}</span>
                  <span>{v.name}</span>
                  <span className="text-xs text-muted-foreground">{DATA_TYPE_LABELS[v.dataType] || v.dataType}</span>
                  <span className="text-xs text-muted-foreground truncate">{v.description || '-'}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditing(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(v.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              )
            ))}

            {variables.length === 0 && !isAdding && (
              <div className="text-center text-muted-foreground text-sm py-8">
                暂无变量，点击"新增变量"添加
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
