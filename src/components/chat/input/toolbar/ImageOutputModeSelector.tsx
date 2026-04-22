import React from 'react';
import type { ImageOutputMode } from '../../../../types/settings';
import { Select } from '../../../shared/Select';

interface ImageOutputModeSelectorProps {
  imageOutputMode: ImageOutputMode;
  setImageOutputMode: (mode: ImageOutputMode) => void;
  t: (key: string) => string;
}

export const ImageOutputModeSelector: React.FC<ImageOutputModeSelectorProps> = ({
  imageOutputMode,
  setImageOutputMode,
  t,
}) => (
  <Select
    id="image-output-mode-selector"
    label={t('imageOutputMode_title')}
    hideLabel
    value={imageOutputMode}
    onChange={(e) => setImageOutputMode(e.target.value as ImageOutputMode)}
    className="mb-0"
    wrapperClassName="relative w-[150px]"
    direction="up"
  >
    <option value="IMAGE_TEXT">{t('imageOutputMode_textAndImage')}</option>
    <option value="IMAGE_ONLY">{t('imageOutputMode_imageOnly')}</option>
  </Select>
);
