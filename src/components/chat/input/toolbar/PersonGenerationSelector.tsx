import React from 'react';
import { useI18n } from '../../../../contexts/I18nContext';
import type { ImagePersonGeneration } from '../../../../types/settings';
import { Select } from '../../../shared/Select';

interface PersonGenerationSelectorProps {
  personGeneration: ImagePersonGeneration;
  setPersonGeneration: (mode: ImagePersonGeneration) => void;
}

export const PersonGenerationSelector: React.FC<PersonGenerationSelectorProps> = ({
  personGeneration,
  setPersonGeneration,
}) => {
  const { t } = useI18n();
  return (
    <Select
      id="person-generation-selector"
      label={t('personGeneration_title')}
      hideLabel
      value={personGeneration}
      onChange={(e) => setPersonGeneration(e.target.value as ImagePersonGeneration)}
      className="mb-0"
      wrapperClassName="relative w-[170px]"
      direction="up"
    >
      <option value="ALLOW_ADULT">{t('personGeneration_allowAdult')}</option>
      <option value="ALLOW_ALL">{t('personGeneration_allowAll')}</option>
      <option value="DONT_ALLOW">{t('personGeneration_dontAllow')}</option>
    </Select>
  );
};
