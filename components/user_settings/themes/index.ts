// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {savePreferences, saveTheme} from 'mattermost-redux/actions/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {GlobalState} from 'types/store';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import UserSettingsThemes from './user_settings_themes';

function mapStateToProps(state: GlobalState) {
    return {
        currentUserId: getCurrentUserId(state),
        teamId: getCurrentTeamId(state),
        theme: getTheme(state),
    };
}

const mapDispatchToProps = {
    savePreferences,
    saveTheme,
};

export default connect(mapStateToProps, mapDispatchToProps)(UserSettingsThemes);
