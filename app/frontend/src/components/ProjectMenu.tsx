import { useRef } from 'react';
import { Check, ChevronsUpDown, Download, FolderOpen, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Project } from '@/lib/types';

interface Props {
  projects: Project[];
  active: Project;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: () => void;
  onDelete: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function ProjectMenu({ projects, active, onSwitch, onCreate, onRename, onDelete, onExport, onImport }: Props) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
      <DropdownMenu>
        <DropdownMenuTrigger className="press flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-left hover:bg-[#24242e]">
          <span className="truncate text-[14px] font-semibold">{active.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#62626f]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 border-[#24242e] bg-[#17171e] text-[#ededf2]">
          <DropdownMenuLabel className="text-xs text-[#62626f]">我的工程（{projects.length}）</DropdownMenuLabel>
          <div className="thin-scroll max-h-56 overflow-auto">
            {projects.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => onSwitch(p.id)} className="gap-2 focus:bg-[#24242e] focus:text-[#ededf2]">
                <FolderOpen className="h-4 w-4 text-[#62626f]" />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-mono text-[10px] text-[#62626f]">v{p.versions.length}</span>
                {p.id === active.id && <Check className="h-3.5 w-3.5 text-[#8b5cf6]" />}
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator className="bg-[#24242e]" />
          <DropdownMenuItem onClick={onCreate} className="gap-2 focus:bg-[#24242e] focus:text-[#ededf2]"><Plus className="h-4 w-4" />新建工程</DropdownMenuItem>
          <DropdownMenuItem onClick={onRename} className="gap-2 focus:bg-[#24242e] focus:text-[#ededf2]"><Pencil className="h-4 w-4" />重命名当前工程</DropdownMenuItem>
          <DropdownMenuItem onClick={onExport} className="gap-2 focus:bg-[#24242e] focus:text-[#ededf2]"><Download className="h-4 w-4" />导出工程 JSON</DropdownMenuItem>
          <DropdownMenuItem onClick={() => file.current?.click()} className="gap-2 focus:bg-[#24242e] focus:text-[#ededf2]"><Upload className="h-4 w-4" />导入工程 JSON</DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#24242e]" />
          <DropdownMenuItem onClick={onDelete} className="gap-2 text-[#f87171] focus:bg-[#f87171]/10 focus:text-[#f87171]"><Trash2 className="h-4 w-4" />删除当前工程</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
