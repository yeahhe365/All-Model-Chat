import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Link } from 'lucide-react';
import { InputBar } from './InputBar';

interface AddFileByIdInputProps {
  fileIdInput: string;
  setFileIdInput: (value: string) => void;
  onAddFileByIdSubmit: () => void;
  onCancel: () => void;
  isAddingById: boolean;
  isLoading: boolean;
}

export const AddFileByIdInput: React.FC<AddFileByIdInputProps> = ({
  fileIdInput,
  setFileIdInput,
  onAddFileByIdSubmit,
  onCancel,
  isAddingById,
  isLoading,
}) => {
  const { t } = useI18n();
  return (
    <InputBar
      value={fileIdInput}
      onChange={setFileIdInput}
      onSubmit={onAddFileByIdSubmit}
      onCancel={onCancel}
      placeholder={t('addById_placeholder')}
      icon={<Link size={16} strokeWidth={2} />}
      isLoading={isLoading}
      disabled={isAddingById}
      submitLabel={t('add')}
      ariaLabel={t('addById_aria')}
      footer={
        <div className="px-2 mt-1.5">
          <p className="text-[10px] text-[var(--theme-text-tertiary)] flex items-center gap-1.5 ml-1">
            <span className="inline-block w-1 h-1 rounded-full bg-[var(--theme-text-tertiary)]" />
            {t('addById_hint')}
          </p>
        </div>
      }
    />
  );
};
