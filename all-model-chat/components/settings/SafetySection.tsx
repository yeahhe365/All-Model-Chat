
import React from 'react';
import { SafetySetting, HarmCategory, HarmBlockThreshold } from '../../types/settings';
import { translations } from '../../utils/appUtils';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { DEFAULT_SAFETY_SETTINGS } from '../../constants/appConstants';

interface SafetySectionProps {
  safetySettings: SafetySetting[] | undefined;
  setSafetySettings: (settings: SafetySetting[]) => void;
  t: (key: keyof typeof translations | string) => string;
}

const categoryMap: Record<HarmCategory, string> = {
    [HarmCategory.HARM_CATEGORY_HARASSMENT]: 'safety_category_HARASSMENT',
    [HarmCategory.HARM_CATEGORY_HATE_SPEECH]: 'safety_category_HATE_SPEECH',
    [HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT]: 'safety_category_SEXUALLY_EXPLICIT',
    [HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT]: 'safety_category_DANGEROUS_CONTENT',
    [HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY]: 'safety_category_CIVIC_INTEGRITY',
};

// Map internal enum to UI slider index (0-4)
const thresholdSteps: HarmBlockThreshold[] = [
    HarmBlockThreshold.OFF,
    HarmBlockThreshold.BLOCK_NONE,
    HarmBlockThreshold.BLOCK_ONLY_HIGH, // Block few
    HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, // Block some (Default)
    HarmBlockThreshold.BLOCK_LOW_AND_ABOVE // Block most
];

const thresholdLabels: Record<HarmBlockThreshold, string> = {
    [HarmBlockThreshold.OFF]: 'safety_threshold_OFF',
    [HarmBlockThreshold.BLOCK_NONE]: 'safety_threshold_BLOCK_NONE',
    [HarmBlockThreshold.BLOCK_ONLY_HIGH]: 'safety_threshold_BLOCK_ONLY_HIGH',
    [HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE]: 'safety_threshold_BLOCK_MEDIUM_AND_ABOVE',
    [HarmBlockThreshold.BLOCK_LOW_AND_ABOVE]: 'safety_threshold_BLOCK_LOW_AND_ABOVE',
};

// Colors for the slider track/label based on index
const stepColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
const stepTextColors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'];

export const SafetySection: React.FC<SafetySectionProps> = ({ safetySettings, setSafetySettings, t }) => {
    
    // Ensure we have a complete set of settings, defaulting if missing
    const currentSettings = safetySettings || DEFAULT_SAFETY_SETTINGS;

    const handleSliderChange = (category: HarmCategory, valueIndex: number) => {
        const newThreshold = thresholdSteps[valueIndex];
        
        const newSettings = [...currentSettings];
        const existingIndex = newSettings.findIndex(s => s.category === category);
        
        if (existingIndex !== -1) {
            newSettings[existingIndex] = { ...newSettings[existingIndex], threshold: newThreshold };
        } else {
            newSettings.push({ category, threshold: newThreshold });
        }
        setSafetySettings(newSettings);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3 p-4 bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-secondary)] rounded-xl">
                <Shield size={24} className="text-[var(--theme-text-link)] flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-base font-semibold text-[var(--theme-text-primary)]">{t('safety_title')}</h3>
                    <p className="text-sm text-[var(--theme-text-secondary)] mt-1 leading-relaxed opacity-90">
                        {t('safety_description')}
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                {Object.values(HarmCategory).map((category) => {
                    const setting = currentSettings.find(s => s.category === category) || { category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE };
                    const currentIndex = thresholdSteps.indexOf(setting.threshold);
                    // Fallback index if unknown threshold is set (default to 3: Block Some)
                    const sliderValue = currentIndex !== -1 ? currentIndex : 3; 

                    return (
                        <div key={category} className="space-y-3 pb-4 border-b border-[var(--theme-border-secondary)]/50 last:border-0">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-[var(--theme-text-primary)]">
                                    {t(categoryMap[category])}
                                </label>
                                <span className={`text-xs font-bold uppercase tracking-wider ${stepTextColors[sliderValue] || 'text-[var(--theme-text-primary)]'}`}>
                                    {t(thresholdLabels[setting.threshold])}
                                </span>
                            </div>
                            
                            <input
                                type="range"
                                min="0"
                                max="4"
                                step="1"
                                value={sliderValue}
                                onChange={(e) => handleSliderChange(category, parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-[var(--theme-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-bg-accent)] hover:accent-[var(--theme-bg-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
                            />
                            
                            <div className="flex justify-between px-1">
                                {thresholdSteps.map((step, idx) => (
                                    <div key={step} className="flex flex-col items-center w-8">
                                        <div className={`w-1 h-2 rounded-full mb-1 ${idx === sliderValue ? 'bg-[var(--theme-text-primary)] h-3' : 'bg-[var(--theme-border-secondary)]'}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--theme-text-tertiary)] pt-4">
                <Info size={14} />
                <span>Changes apply to new messages.</span>
            </div>
        </div>
    );
};