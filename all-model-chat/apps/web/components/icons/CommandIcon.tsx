import React from 'react';
import { HelpCircle, UploadCloud, Trash2, FilePlus2, Settings, Wand2, Globe, Terminal, Link, Pin, RotateCw, Bot, ImageIcon, Edit3, PictureInPicture, Bookmark, Telescope, CornerDownLeft, Zap } from 'lucide-react';
import { IconStop } from './CustomIcons';

export const CommandIcon: React.FC<{ icon: string }> = ({ icon }) => {
    const iconProps = { size: 18, strokeWidth: 2 };
    switch (icon) {
        case 'bot': return <Bot {...iconProps} />;
        case 'help': return <HelpCircle {...iconProps} />;
        case 'edit': return <Edit3 {...iconProps} />;
        case 'pin': return <Pin {...iconProps} />;
        case 'retry': return <RotateCw {...iconProps} />;
        case 'stop': return <IconStop size={14} color="currentColor" />;
        case 'search': return <Globe {...iconProps} />;
        case 'deep': return <Telescope {...iconProps} />;
        case 'code': return <Terminal {...iconProps} />;
        case 'url': return <Link {...iconProps} />;
        case 'file': return <UploadCloud {...iconProps} />;
        case 'clear': return <Trash2 {...iconProps} />;
        case 'new': return <FilePlus2 {...iconProps} />;
        case 'settings': return <Settings {...iconProps} />;
        case 'canvas': return <Wand2 {...iconProps} />;
        case 'image': return <ImageIcon {...iconProps} />;
        case 'pip': return <PictureInPicture {...iconProps} />;
        case 'fast': return <Zap {...iconProps} />;
        case 'default': return <Bookmark {...iconProps} />;
        default: return <Bot {...iconProps} />;
    }
};