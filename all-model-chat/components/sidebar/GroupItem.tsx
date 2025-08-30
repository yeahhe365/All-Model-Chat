import React from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { ChatGroup, SavedChatSession } from '../../types';
import { SessionItem } from './SessionItem';
import { GroupItemMenu } from './GroupItemMenu';
import { translations } from '../../utils/appUtils';

// Define a type for the props that are passed down to SessionItem
type SessionItemPassedProps = Omit<React.ComponentProps<typeof SessionItem>, 'session'>;

interface GroupItemProps extends SessionItemPassedProps {
  group: ChatGroup;
  sessions: SavedChatSession[];
  editingGroup: { id: string, title: string } | null;
  dragOverId: string | null;
  onToggleGroupExpansion: (groupId: string) => void;
  handleGroupStartEdit: (item: ChatGroup) => void;
  handleDrop: (e: React.DragEvent, groupId: string | null) => void;
  handleDragOver: (e: React.DragEvent) => void;
  setDragOverId: (id: string | null) => void;
  setEditingGroup: (group: { id: string, title: string } | null) => void;
  onDeleteGroup: (groupId: string) => void;
  t: (key: keyof typeof translations) => string;
}

export const GroupItem: React.FC<GroupItemProps> = (props) => {
  const { 
    group, sessions, editingGroup, dragOverId, onToggleGroupExpansion, 
    handleGroupStartEdit, handleDrop, handleDragOver, setDragOverId,
    setEditingGroup, onDeleteGroup, t, ...sessionItemProps
  } = props;
  
  return (
    <div 
      onDragOver={handleDragOver} 
      onDrop={(e) => handleDrop(e, group.id)} 
      onDragEnter={() => setDragOverId(group.id)} 
      onDragLeave={() => setDragOverId(null)} 
      className={`rounded-lg transition-colors ${dragOverId === group.id ? 'bg-[var(--theme-bg-accent)] bg-opacity-20' : ''}`}
    >
      <details open={group.isExpanded ?? true} className="group/details">
        <summary 
            className="list-none flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-[var(--theme-bg-tertiary)] group"
            onClick={(e) => { e.preventDefault(); onToggleGroupExpansion(group.id); }}
        >
          <div className="flex items-center gap-2 min-w-0">
             <ChevronDown size={16} className="text-[var(--theme-text-tertiary)] transition-transform group-open/details:rotate-180 flex-shrink-0" />
             {editingGroup?.id === group.id ? (
                <input ref={props.editInputRef} type="text" value={editingGroup.title} onChange={(e) => setEditingGroup({...editingGroup, title: e.target.value})} onBlur={props.handleRenameConfirm} onKeyDown={props.handleRenameKeyDown} onClick={e => e.stopPropagation()} className="bg-transparent border border-[var(--theme-border-focus)] rounded-md px-1 py-0 text-sm w-full font-semibold" />
             ) : (
                <span className="font-semibold text-sm truncate text-[var(--theme-text-secondary)]">{group.title}</span>
             )}
          </div>
            <button onClick={(e) => props.toggleMenu(e, group.id)} className="p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"><MoreHorizontal size={16} /></button>
        </summary>
        {props.activeMenu === group.id && (
          <GroupItemMenu
            menuRef={props.menuRef}
            onStartEdit={() => { handleGroupStartEdit(group); props.setActiveMenu(null); }}
            onDelete={() => { onDeleteGroup(group.id); props.setActiveMenu(null); }}
            t={t}
          />
        )}
        <ul className="pl-3">{sessions?.map(session => <SessionItem key={session.id} session={session} {...sessionItemProps} />)}</ul>
      </details>
    </div>
  );
};
