
import { useState, useEffect, useRef, useMemo } from 'react';
import { SavedChatSession, ChatGroup } from '../types';
import { useWindowContext } from '../contexts/WindowContext';
import { translations } from '../utils/appUtils';
import { dbService } from '../utils/db';

interface UseHistorySidebarLogicProps {
    isOpen: boolean;
    onToggle: () => void;
    sessions: SavedChatSession[];
    groups: ChatGroup[];
    generatingTitleSessionIds: Set<string>;
    onRenameSession: (sessionId: string, newTitle: string) => void;
    onRenameGroup: (groupId: string, newTitle: string) => void;
    onMoveSessionToGroup: (sessionId: string, groupId: string | null) => void;
    onSelectSession: (sessionId: string) => void;
    t: (key: keyof typeof translations, fallback?: string) => string;
    language: 'en' | 'zh';
}

export const useHistorySidebarLogic = ({
    isOpen,
    onToggle,
    sessions,
    groups,
    generatingTitleSessionIds,
    onRenameSession,
    onRenameGroup,
    onMoveSessionToGroup,
    onSelectSession,
    t,
    language
}: UseHistorySidebarLogicProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [editingItem, setEditingItem] = useState<{ type: 'session' | 'group', id: string, title: string } | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [newlyTitledSessionId, setNewlyTitledSessionId] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<{ query: string, ids: Set<string> } | null>(null);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);
    const prevGeneratingTitleSessionIdsRef = useRef<Set<string>>(new Set());
    
    const { document: targetDocument } = useWindowContext();

    // --- Effects ---

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setActiveMenu(null);
        };
        if (activeMenu) targetDocument.addEventListener('mousedown', handleClickOutside);
        return () => targetDocument.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenu, targetDocument]);

    // Auto-focus input when editing starts
    useEffect(() => {
        if (editingItem) editInputRef.current?.focus();
    }, [editingItem]);
    
    // Animation for newly titled sessions
    useEffect(() => {
        const prevIds = prevGeneratingTitleSessionIdsRef.current;
        const completedIds = new Set<string>();
        prevIds.forEach(id => { if (!generatingTitleSessionIds.has(id)) completedIds.add(id); });
        completedIds.forEach(completedId => {
            setNewlyTitledSessionId(completedId);
            setTimeout(() => setNewlyTitledSessionId(p => (p === completedId ? null : p)), 1500);
        });
        prevGeneratingTitleSessionIdsRef.current = generatingTitleSessionIds;
    }, [generatingTitleSessionIds]);

    // Search Effect - Async Content Search
    useEffect(() => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) {
            setSearchResults(null);
            return;
        }

        const handler = setTimeout(async () => {
            try {
                const ids = await dbService.searchSessions(trimmedQuery);
                setSearchResults({ query: trimmedQuery, ids: new Set(ids) });
            } catch (e) {
                console.error("Search error", e);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // --- Data Processing (Memoized) ---

    const filteredSessions = useMemo(() => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) return sessions;
        
        // Use DB results if available and matching current query
        if (searchResults && searchResults.query === trimmedQuery) {
            return sessions.filter(session => searchResults.ids.has(session.id));
        }

        // Fallback filter (metadata only) while searching or before DB results ready
        // This ensures the UI remains responsive, though it may temporarily miss content-only matches until async search completes
        const query = trimmedQuery.toLowerCase();
        return sessions.filter(session => {
            if (session.title.toLowerCase().includes(query)) return true;
            // Check messages if available (usually only for active session in memory)
            return session.messages.some(message => message.content.toLowerCase().includes(query));
        });
    }, [sessions, searchQuery, searchResults]);

    const sessionsByGroupId = useMemo(() => {
        const map = new Map<string | null, SavedChatSession[]>();
        map.set(null, []); // For ungrouped sessions
        groups.forEach(group => map.set(group.id, []));
        filteredSessions.forEach(session => {
            const key = session.groupId && map.has(session.groupId) ? session.groupId : null;
            map.get(key)?.push(session);
        });
        map.forEach(sessionList => sessionList.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.timestamp - a.timestamp;
        }));
        return map;
    }, [filteredSessions, groups]);

    const sortedGroups = useMemo(() => [...groups].sort((a,b) => b.timestamp - a.timestamp), [groups]);

    const categorizedUngroupedSessions = useMemo(() => {
        const ungroupedSessions = sessionsByGroupId.get(null) || [];
        const unpinned = ungroupedSessions.filter(s => !s.isPinned);

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgoStart = new Date(todayStart);
        sevenDaysAgoStart.setDate(todayStart.getDate() - 7);
        const thirtyDaysAgoStart = new Date(todayStart);
        thirtyDaysAgoStart.setDate(todayStart.getDate() - 30);

        const categories: { [key: string]: SavedChatSession[] } = {};

        const categoryKeys = {
            today: t('history_today', 'Today'),
            sevenDays: t('history_7_days', 'Previous 7 Days'),
            thirtyDays: t('history_30_days', 'Previous 30 Days'),
        };

        unpinned.forEach(session => {
            const sessionDate = new Date(session.timestamp);
            let categoryName: string;

            if (sessionDate >= todayStart) {
                categoryName = categoryKeys.today;
            } else if (sessionDate >= sevenDaysAgoStart) {
                categoryName = categoryKeys.sevenDays;
            } else if (sessionDate >= thirtyDaysAgoStart) {
                categoryName = categoryKeys.thirtyDays;
            } else {
                categoryName = new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN-u-nu-hanidec' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                }).format(sessionDate);
            }
            if (!categories[categoryName]) {
                categories[categoryName] = [];
            }
            categories[categoryName].push(session);
        });

        const staticOrder = [categoryKeys.today, categoryKeys.sevenDays, categoryKeys.thirtyDays];
        const monthCategories = Object.keys(categories).filter(name => !staticOrder.includes(name))
            .sort((a, b) => {
                const dateA = new Date(categories[a][0].timestamp);
                const dateB = new Date(categories[b][0].timestamp);
                return dateB.getTime() - dateA.getTime();
            });

        const categoryOrder = [...staticOrder, ...monthCategories].filter(name => categories[name] && categories[name].length > 0);
        
        return { categories, categoryOrder };
    }, [sessionsByGroupId, t, language]);

    // --- Handlers ---

    const handleStartEdit = (type: 'session' | 'group', item: SavedChatSession | ChatGroup) => {
        const title = 'title' in item ? item.title : '';
        setEditingItem({ type, id: item.id, title });
        setActiveMenu(null);
    };

    const handleRenameConfirm = () => {
        if (!editingItem || !editingItem.title.trim()) {
            setEditingItem(null);
            return;
        }
        if (editingItem.type === 'session') {
            onRenameSession(editingItem.id, editingItem.title.trim());
        } else if (editingItem.type === 'group') {
            onRenameGroup(editingItem.id, editingItem.title.trim());
        }
        setEditingItem(null);
    };
    
    const handleRenameCancel = () => { setEditingItem(null); };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleRenameConfirm();
        else if (e.key === 'Escape') handleRenameCancel();
    };

    const toggleMenu = (e: React.MouseEvent, id: string) => { 
        e.stopPropagation(); 
        setActiveMenu(activeMenu === id ? null : id); 
    };

    const handleDragStart = (e: React.DragEvent, sessionId: string) => { 
        e.dataTransfer.setData('sessionId', sessionId);
        e.dataTransfer.effectAllowed = 'move';
    };
    
    const handleDragOver = (e: React.DragEvent) => { 
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    };
    
    const handleDrop = (e: React.DragEvent, groupId: string | null) => {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling to prevent double drops
        const sessionId = e.dataTransfer.getData('sessionId');
        const targetGroupId = groupId === 'all-conversations' ? null : groupId;
        if (sessionId) onMoveSessionToGroup(sessionId, targetGroupId);
        setDragOverId(null);
    };

    const handleMainDragLeave = (e: React.DragEvent) => {
        // Only reset if leaving the main container, not entering a child
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOverId(null);
    };

    const handleMiniSearchClick = () => {
        onToggle();
        setIsSearching(true);
    };

    const handleEmptySpaceClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onToggle();
        }
    };

    const handleSessionSelect = (sessionId: string) => {
        onSelectSession(sessionId);
        // Auto-close sidebar on mobile
        if (window.innerWidth < 768) {
            onToggle();
        }
    };

    return {
        searchQuery, setSearchQuery,
        isSearching, setIsSearching,
        editingItem, setEditingItem,
        activeMenu, setActiveMenu,
        dragOverId, setDragOverId,
        newlyTitledSessionId,
        menuRef,
        editInputRef,
        filteredSessions,
        sessionsByGroupId,
        sortedGroups,
        categorizedUngroupedSessions,
        handleStartEdit,
        handleRenameConfirm,
        handleRenameCancel,
        handleRenameKeyDown,
        toggleMenu,
        handleDragStart,
        handleDragOver,
        handleDrop,
        handleMainDragLeave,
        handleMiniSearchClick,
        handleEmptySpaceClick,
        handleSessionSelect,
    };
};
