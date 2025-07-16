import React from 'react';

const AspectRatioIcon = ({ ratio }: { ratio: string }) => {
    let styles: React.CSSProperties = {};
    switch (ratio) {
        case '1:1': styles = { width: '20px', height: '20px' }; break;
        case '9:16': styles = { width: '12px', height: '21px' }; break;
        case '16:9': styles = { width: '24px', height: '13.5px' }; break;
        case '4:3': styles = { width: '20px', height: '15px' }; break;
        case '3:4': styles = { width: '15px', height: '20px' }; break;
    }
    return <div style={styles} className="border-2 border-current rounded-sm mb-1"></div>;
};

const aspectRatios = ['1:1', '9:16', '16:9', '4:3', '3:4'];

interface ImagenAspectRatioSelectorProps {
    aspectRatio: string;
    setAspectRatio: (ratio: string) => void;
    t: (key: string) => string;
}

export const ImagenAspectRatioSelector: React.FC<ImagenAspectRatioSelectorProps> = ({ aspectRatio, setAspectRatio, t }) => {
    return (
        <div className="mb-2">
            <div className="flex items-center gap-x-2 sm:gap-x-3 gap-y-2 flex-wrap">
                {aspectRatios.map(ratioValue => {
                    const isSelected = aspectRatio === ratioValue;
                    return (
                        <button
                            key={ratioValue}
                            onClick={() => setAspectRatio(ratioValue)}
                            className={`p-2 rounded-lg flex flex-col items-center justify-center min-w-[50px] text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-primary)] focus:ring-[var(--theme-border-focus)] ${isSelected ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50'}`}
                            title={`${t('aspectRatio_title')} ${ratioValue}`}
                        >
                            <AspectRatioIcon ratio={ratioValue} />
                            <span>{ratioValue}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
