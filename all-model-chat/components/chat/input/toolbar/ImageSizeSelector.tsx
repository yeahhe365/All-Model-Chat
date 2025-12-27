
import React from 'react';

const defaultSizes = ['1K', '2K', '4K'];

interface ImageSizeSelectorProps {
    imageSize: string;
    setImageSize: (size: string) => void;
    t: (key: string) => string;
    supportedSizes?: string[];
}

export const ImageSizeSelector: React.FC<ImageSizeSelectorProps> = ({ imageSize, setImageSize, t, supportedSizes }) => {
    const sizes = supportedSizes || defaultSizes;
    return (
        <div className="mb-2">
            <div className="flex items-center gap-x-2">
                {sizes.map(sizeValue => {
                    const isSelected = imageSize === sizeValue;
                    return (
                        <button
                            key={sizeValue}
                            onClick={() => setImageSize(sizeValue)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-primary)] focus-visible:ring-[var(--theme-border-focus)] ${isSelected ? 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border border-[var(--theme-border-secondary)]' : 'text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-secondary)]/50'}`}
                            title={`Set resolution to ${sizeValue}`}
                        >
                            {sizeValue}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
