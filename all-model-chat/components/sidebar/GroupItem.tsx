
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
  editingItem: { type: 'session' | 'group', id: string, title: string } | null;
  dragOverId: string | null;
  onToggleGroupExpansion: (groupId: string) => void;
  handleGroupStartEdit: (item: ChatGroup) => void;
  handleDrop: (e: React.DragEvent, groupId: string | null) => void;
  handleDragOver: (e: React.DragEvent) => void;
  setDragOverId: (id: string | null) => void;
  setEditingItem: (item: { type: 'session' | 'group', id: string, title: string } | null) => void;
  onDeleteGroup: (groupId: string) => void;
  t: (key: keyof typeof translations) => string;
}

export const GroupItem: React.FC<GroupItemProps> = (props) => {
  const { 
    group, sessions, editingItem, dragOverId, onToggleGroupExpansion, 
    handleGroupStartEdit, handleDrop, handleDragOver, setDragOverId,
    setEditingItem, onDeleteGroup, t, ...sessionItemProps
  } = props;
  
  return (
    <div 
      onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevent bubbling to the "all conversations" drop zone
          e.dataTransfer.dropEffect = 'move';
          handleDragOver(e);
      }} 
      onDrop={(e) => handleDrop(e, group.id)} 
      onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverId(group.id);
      }} 
      onDragLeave={(e) => {
          // Check if we are entering a child of this element (e.g., text, button)
          // If so, do NOT reset the dragOverId
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOverId(null);
      }} 
      className={`rounded-lg transition-all duration-200 mb-1 ${dragOverId === group.id ? 'bg-[var(--theme-bg-accent)] bg-opacity-20 ring-2 ring-[var(--theme-bg-accent)] ring-inset ring-opacity-50' : ''}`}
    >
      <details open={group.isExpanded ?? true} className="group/details">
        <summary 
            className="list-none flex items-center justify-between px-1 py-2 rounded-lg cursor-pointer hover:bg-[var(--theme-bg-tertiary)] group"
            onClick={(e) => { e.preventDefault(); onToggleGroupExpansion(group.id); }}
        >
          <div className="flex items-center gap-2 min-w-0">
             <ChevronDown size={16} className="text-[var(--theme-text-tertiary)] transition-transform group-open/details:rotate-180 flex-shrink-0" strokeWidth={2} />
             {editingItem?.type === 'group' && editingItem.id === group.id ? (
                <input ref={props.editInputRef} type="text" value={editingItem.title} onChange={(e) => setEditingItem({...editingItem, title: e.target.value})} onBlur={props.handleRenameConfirm} onKeyDown={props.handleRenameKeyDown} onClick={e => e.stopPropagation()} className="bg-transparent border border-[var(--theme-border-focus)] rounded-md px-1 py-0 text-sm w-full font-semibold" />
             ) : (
                <span className="font-semibold text-sm truncate text-[var(--theme-text-secondary)]">{group.title}</span>
             )}
          </div>
            <button onClick={(e) => props.toggleMenu(e, group.id)} className="p-1 rounded-full text-[var(--theme-text-tertiary)] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"><MoreHorizontal size={16} strokeWidth={2} /></button>
        </summary>
        {props.activeMenu === group.id && (
          <GroupItemMenu
            menuRef={props.menuRef}
            onStartEdit={() => { handleGroupStartEdit(group); props.setActiveMenu(null); }}
            onDelete={() => { onDeleteGroup(group.id); props.setActiveMenu(null); }}
            t={t}
          />
        )}
        <ul className="pl-1 pb-1">{sessions?.map(session => <SessionItem key={session.id} session={session} {...sessionItemProps} />)}</ul>
      </details>
    </div>
  );
};
