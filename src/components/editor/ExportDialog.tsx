import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportTab {
    id: string;
    name: string;
}

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tabs: ExportTab[];
    onConfirm: (selectedIds: string[]) => void;
    isExporting: boolean;
}

export const ExportDialog = ({ open, onOpenChange, tabs, onConfirm, isExporting }: ExportDialogProps) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (open) {
            // Default select all
            setSelectedIds(new Set(tabs.map(t => t.id)));
        }
    }, [open, tabs]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === tabs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tabs.map(t => t.id)));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>批量导出菜单</DialogTitle>
                    <DialogDescription>
                        请选择要导出的菜单文件。它们将被打包为一个 ZIP 文件。
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">
                        已选择 {selectedIds.size} / {tabs.length}
                    </span>
                    <Button variant="ghost" size="sm" onClick={toggleAll} className="h-8 text-xs">
                        {selectedIds.size === tabs.length ? '取消全选' : '全选'}
                    </Button>
                </div>

                <div className="max-h-[300px] overflow-y-auto py-2 space-y-1">
                    {tabs.map(tab => (
                        <div 
                            key={tab.id}
                            className={cn(
                                "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors select-none",
                                selectedIds.has(tab.id) && "bg-muted/50"
                            )}
                            onClick={() => toggleSelection(tab.id)}
                        >
                            <div className={cn(
                                "w-4 h-4 border rounded flex items-center justify-center transition-colors shrink-0",
                                selectedIds.has(tab.id) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                            )}>
                                {selectedIds.has(tab.id) && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-sm font-medium truncate flex-1">{tab.name}</span>
                        </div>
                    ))}
                    {tabs.length === 0 && (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            没有可导出的菜单
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
                        取消
                    </Button>
                    <Button 
                        onClick={() => onConfirm(Array.from(selectedIds))} 
                        disabled={isExporting || selectedIds.size === 0}
                    >
                        {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isExporting ? '正在打包...' : '导出 ZIP'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
