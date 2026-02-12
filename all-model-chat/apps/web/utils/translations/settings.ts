import { generalSettings } from './settings/general';
import { appearanceSettings } from './settings/appearance';
import { apiSettings } from './settings/api';
import { modelSettings } from './settings/model';
import { dataSettings } from './settings/data';
import { safetySettings } from './settings/safety';
import { shortcutsSettings } from './settings/shortcuts';
import { aboutSettings } from './settings/about';

export const settingsTranslations = {
    ...generalSettings,
    ...appearanceSettings,
    ...apiSettings,
    ...modelSettings,
    ...dataSettings,
    ...safetySettings,
    ...shortcutsSettings,
    ...aboutSettings,
};