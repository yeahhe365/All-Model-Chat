
import React from 'react';
import { Sparkles } from 'lucide-react';
import { Select } from '../../../shared/Select';

const AspectRatioIcon = ({ ratio, className }: { ratio: string; className?: string }) => {
    if (ratio === 'Auto') {
        return <Sparkles size={16} className={className} strokeWidth={2} />;
    }
    let styles: React.CSSProperties = {};
    switch (ratio) {
        case '1:1': styles = { width: '20px', height: '20px' }; break;
        case '9:16': styles = { width: '12px', height: '21px' }; break;
        case '16:9': styles = { width: '24px', height: '13.5px' }; break;
        case '4:3': styles = { width: '20px', height: '15px' }; break;
        case '3:4': styles = { width: '15px', height: '20px' }; break;
        case '2:3': styles = { width: '14px', height: '21px' }; break;
        case '3:2': styles = { width: '21px', height: '14px' }; break;
        case '4:5': styles = { width: '16px', height: '20px' }; break;
        case '5:4': styles = { width: '20px', height: '16px' }; break;
        case '21:9': styles = { width: '24px', height: '10px' }; break;
        default: styles = { width: '20px', height: '20px' }; break;
    }
    return <div style={styles} className={`border-2 border-current rounded-sm ${className || ''}`}></div>;
};

const defaultAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2', '4:5', '5:4', '21:9'];

interface ImagenAspectRatioSelectorProps {
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    t: (key: string) => string;
    supportedRatios?: string[];
}

export const ImagenAspectRatioSelector: React.FC<ImagenAspectRatioSelectorProps> = ({ aspectRatio, setAspectRatio, t, supportedRatios }) => {
    const ratios = supportedRatios || defaultAspectRatios;

    return (
        <Select
            id="aspect-ratio-selector"
            label={t('aspectRatio_title')}
            hideLabel
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="mb-0"
            wrapperClassName="relative w-[120px]"
        >
            {ratios.map(r => (
                <option key={r} value={r}>
                    <div className="flex items-center gap-2">
                        <AspectRatioIcon ratio={r} />
                        <span>{r}</span>
                    </div>
                </option>
            ))}
        </Select>
    );
};
