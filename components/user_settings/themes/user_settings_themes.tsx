// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import Constants from 'utils/constants';

import {Theme} from 'mattermost-redux/selectors/entities/preferences';
import {applyTheme} from 'utils/utils';

import {ActionFunc} from 'mattermost-redux/types/actions';

import SectionCreator from '../generic/section_creator';
import {PreferenceType} from '@mattermost/types/preferences';
import SaveChangesPanel from '../generic/save_changes_panel';
import CheckboxItemCreator from '../generic/checkbox-item-creator';

import PremadeThemeChooser from './premade_theme_chooser';

import {
    DarkThemeColorsSectionDesc,
    DarkThemeColorsSectionTitle, LightThemeColorsSectionDesc, LightThemeColorsSectionTitle,
    PreMadeDarkTheme, PreMadeLightTheme,
    SyncWithOsSectionDesc,
    SyncWithOsSectionInputFieldData,
    SyncWithOsSectionTitle, ThemeColorsSectionDesc,
    ThemeColorsSectionTitle,
    ThemeSettings,
} from './utils';

type Props = {
    currentUserId: string;
    teamId: string;
    theme: Theme;
    savePreferences: (userId: string, preferences: PreferenceType[]) => Promise<{data: boolean}>;
    saveTheme: (teamId: string, theme: Theme) => ActionFunc;
}
type SettingsType = {
    [key: string]: string | undefined;
}

export default function UserSettingsThemes(props: Props): JSX.Element {
    const [haveChanges, setHaveChanges] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(props.theme);

    const [settings, setSettings] = useState<SettingsType>({});

    const handleChange = useCallback((values: Record<string, string>) => {
        setSettings({...settings, ...values});
        setHaveChanges(true);
    }, [settings]);

    function handleCancel() {
        setSettings({});
        setHaveChanges(false);
    }

    const handleSubmit = async (): Promise<void> => {
        const preferences: PreferenceType[] = [];
        const {savePreferences, currentUserId} = props;

        Object.keys(settings).forEach((setting) => {
            const category = Constants.Preferences.CATEGORY_ADVANCED_SETTINGS;
            preferences.push({
                user_id: currentUserId,
                category,
                name: setting,
                value: settings[setting],
            });
        });

        await savePreferences(currentUserId, preferences);
        setHaveChanges(false);
        props.saveTheme(props.teamId, currentTheme);
    };

    const SyncWithOsSectionContent = (
        <>
            <CheckboxItemCreator
                inputFieldValue={settings[ThemeSettings.SYNC_WITH_OS] === 'true'}
                inputFieldData={SyncWithOsSectionInputFieldData}
                handleChange={(e) => handleChange({[ThemeSettings.SYNC_WITH_OS]: e.target.value})}
            />
        </>
    );

    const updateTheme = (newTheme: Theme): void => {
        let themeChanged = currentTheme.length === newTheme.length;
        if (!themeChanged) {
            for (const field in newTheme) {
                if (newTheme[field]) {
                    if (currentTheme[field] !== newTheme[field]) {
                        themeChanged = true;
                        break;
                    }
                }
            }
        }
        setCurrentTheme(newTheme);
        applyTheme(newTheme);
    };

    const PreMadeThemeContent = (
        <PremadeThemeChooser
            theme={props.theme}
            updateTheme={updateTheme}
        />
    );

    const PreMadeDarkThemeContent = (
        <PremadeThemeChooser
            themes={PreMadeDarkTheme}
            theme={props.theme}
            updateTheme={updateTheme}
        />
    );

    const PreMadeLightThemeContent = (
        <PremadeThemeChooser
            themes={PreMadeLightTheme}
            theme={props.theme}
            updateTheme={updateTheme}
        />
    );
    return (
        <>
            <SectionCreator
                title={SyncWithOsSectionTitle}
                content={SyncWithOsSectionContent}
                description={SyncWithOsSectionDesc}
            />
            <div className='user-settings-modal__divider'/>
            <SectionCreator
                title={ThemeColorsSectionTitle}
                content={PreMadeThemeContent}
                description={ThemeColorsSectionDesc}
            />
            <div className='user-settings-modal__divider'/>
            <SectionCreator
                title={LightThemeColorsSectionTitle}
                content={PreMadeLightThemeContent}
                description={LightThemeColorsSectionDesc}
            />
            <div className='user-settings-modal__divider'/>
            <SectionCreator
                title={DarkThemeColorsSectionTitle}
                content={PreMadeDarkThemeContent}
                description={DarkThemeColorsSectionDesc}
            />
            {haveChanges &&
                <SaveChangesPanel
                    handleSubmit={handleSubmit}
                    handleCancel={handleCancel}
                />
            }
        </>
    );
}
