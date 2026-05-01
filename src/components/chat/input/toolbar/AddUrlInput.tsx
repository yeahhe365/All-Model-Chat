import React from 'react';
import { useI18n } from '../../../../contexts/I18nContext';
import { IconYoutube } from '../../../icons/CustomIcons';
import { InputBar } from './InputBar';

interface AddUrlInputProps {
  urlInput: string;
  setUrlInput: (value: string) => void;
  onAddUrlSubmit: () => void;
  onCancel: () => void;
  isAddingByUrl: boolean;
  isLoading: boolean;
}

export const AddUrlInput: React.FC<AddUrlInputProps> = ({
  urlInput,
  setUrlInput,
  onAddUrlSubmit,
  onCancel,
  isAddingByUrl,
  isLoading,
}) => {
  const { t } = useI18n();
  return (
    <InputBar
      value={urlInput}
      onChange={setUrlInput}
      onSubmit={onAddUrlSubmit}
      onCancel={onCancel}
      placeholder={t('addByUrl_placeholder')}
      icon={<IconYoutube size={18} strokeWidth={2} />}
      isLoading={isLoading}
      disabled={isAddingByUrl}
      submitLabel={t('add')}
      type="url"
      ariaLabel={t('addByUrl_aria')}
    />
  );
};
