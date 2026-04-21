import React from 'react';
import type { ImagePersonGeneration } from '../../../../types/settings';
import { Select } from '../../../shared/Select';

interface PersonGenerationSelectorProps {
  personGeneration: ImagePersonGeneration;
  setPersonGeneration: (mode: ImagePersonGeneration) => void;
  t: (key: string) => string;
}

export const PersonGenerationSelector: React.FC<PersonGenerationSelectorProps> = ({
  personGeneration,
  setPersonGeneration,
  t,
}) => (
  <Select
    id="person-generation-selector"
    label={t('personGeneration_title')}
    hideLabel
    value={personGeneration}
    onChange={(e) => setPersonGeneration(e.target.value as ImagePersonGeneration)}
    className="mb-0"
    wrapperClassName="relative w-[170px]"
  >
    <option value="ALLOW_ADULT">{t('personGeneration_allowAdult')}</option>
    <option value="ALLOW_ALL">{t('personGeneration_allowAll')}</option>
    <option value="DONT_ALLOW">{t('personGeneration_dontAllow')}</option>
  </Select>
);
