// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {UserProfile} from '@mattermost/types/users';
import {ChannelMembership, ServerChannel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';
import {ServerError} from '@mattermost/types/errors';

import {Client4} from 'mattermost-redux/client';
import {ChannelTypes, PreferenceTypes} from 'mattermost-redux/action_types';
import * as ChannelActions from 'mattermost-redux/actions/channels';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {ActionFunc} from 'mattermost-redux/types/actions';
import {logError} from 'mattermost-redux/actions/errors';
import {loadRolesIfNeeded} from 'mattermost-redux/actions/roles';
import {getMyChannelMemberships} from 'mattermost-redux/selectors/entities/common';
import {getChannelByName, getUnreadChannelIds, getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamUrl, getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {trackEvent} from 'actions/telemetry_actions.jsx';
import {loadNewDMIfNeeded, loadNewGMIfNeeded, loadProfilesForSidebar} from 'actions/user_actions';
import {
    getTeamsChannelsAndMembersQueryString,
    ChannelsAndChannelMembersQueryResponseType,
    getAllChannelsAndMembersQueryString,
    transformToReceivedChannelsReducerPayload,
    transformToReceivedChannelMembersReducerPayload,
} from 'actions/channel_queries';

import {browserHistory} from 'utils/browser_history';
import {Constants, Preferences, NotificationLevels} from 'utils/constants';
import {getDirectChannelName} from 'utils/utils';

export function openDirectChannelToUserId(userId: UserProfile['id']): ActionFunc {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const channelName = getDirectChannelName(currentUserId, userId);
        const channel = getChannelByName(state, channelName);

        if (!channel) {
            return dispatch(ChannelActions.createDirectChannel(currentUserId, userId));
        }

        trackEvent('api', 'api_channels_join_direct');
        const now = Date.now();
        const prefDirect = {
            category: Preferences.CATEGORY_DIRECT_CHANNEL_SHOW,
            name: userId,
            value: 'true',
        };
        const prefOpenTime = {
            category: Preferences.CATEGORY_CHANNEL_OPEN_TIME,
            name: channel.id,
            value: now.toString(),
        };
        const actions = [{
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: [prefDirect],
        }, {
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: [prefOpenTime],
        }];
        dispatch(batchActions(actions));

        dispatch(savePreferences(currentUserId, [
            {user_id: currentUserId, ...prefDirect},
            {user_id: currentUserId, ...prefOpenTime},
        ]));

        return {data: channel};
    };
}

export function openGroupChannelToUserIds(userIds: Array<UserProfile['id']>): ActionFunc {
    return async (dispatch, getState) => {
        const result = await dispatch(ChannelActions.createGroupChannel(userIds));

        if (result.error) {
            browserHistory.push(getCurrentTeamUrl(getState()));
        }

        return result;
    };
}

export function loadChannelsForCurrentUser(): ActionFunc {
    return async (dispatch, getState) => {
        const state = getState();
        const unreads = getUnreadChannelIds(state);

        await dispatch(ChannelActions.fetchMyChannelsAndMembersREST(getCurrentTeamId(state)));
        for (const id of unreads) {
            const channel = getChannel(state, id);
            if (channel && channel.type === Constants.DM_CHANNEL) {
                dispatch(loadNewDMIfNeeded(channel.id));
            } else if (channel && channel.type === Constants.GM_CHANNEL) {
                dispatch(loadNewGMIfNeeded(channel.id));
            }
        }

        loadProfilesForSidebar();
        return {data: true};
    };
}

export function searchMoreChannels(term: string, showArchivedChannels: boolean): ActionFunc<Channel[], ServerError> {
    return async (dispatch, getState) => {
        const state = getState();
        const teamId = getCurrentTeamId(state);

        if (!teamId) {
            throw new Error('No team id');
        }

        const {data, error} = await dispatch(ChannelActions.searchChannels(teamId, term, showArchivedChannels));
        if (data) {
            const myMembers = getMyChannelMemberships(state);

            // When searching public channels, only get channels user is not a member of
            const channels = showArchivedChannels ? data : (data as Channel[]).filter((c) => !myMembers[c.id]);
            return {data: channels};
        }

        return {error};
    };
}

export function autocompleteChannels(term: string, success: (channels: Channel[]) => void, error: (err: ServerError) => void): ActionFunc {
    return async (dispatch, getState) => {
        const state = getState();
        const teamId = getCurrentTeamId(state);
        if (!teamId) {
            return {data: false};
        }

        const {data, error: err} = await dispatch(ChannelActions.autocompleteChannels(teamId, term));
        if (data && success) {
            success(data);
        } else if (err && error) {
            error({id: err.server_error_id, ...err});
        }

        return {data: true};
    };
}

export function autocompleteChannelsForSearch(term: string, success: (channels: Channel[]) => void, error: (err: ServerError) => void): ActionFunc {
    return async (dispatch, getState) => {
        const state = getState();
        const teamId = getCurrentTeamId(state);

        if (!teamId) {
            return {data: false};
        }

        const {data, error: err} = await dispatch(ChannelActions.autocompleteChannelsForSearch(teamId, term));
        if (data && success) {
            success(data);
        } else if (err && error) {
            error({id: err.server_error_id, ...err});
        }
        return {data: true};
    };
}

export function addUsersToChannel(channelId: Channel['id'], userIds: Array<UserProfile['id']>): ActionFunc {
    return async (dispatch) => {
        try {
            const requests = userIds.map((uId) => dispatch(ChannelActions.addChannelMember(channelId, uId)));

            return await Promise.all(requests);
        } catch (error) {
            return {error};
        }
    };
}

export function unmuteChannel(userId: UserProfile['id'], channelId: Channel['id']) {
    return ChannelActions.updateChannelNotifyProps(userId, channelId, {
        mark_unread: NotificationLevels.ALL,
    });
}

export function muteChannel(userId: UserProfile['id'], channelId: Channel['id']) {
    return ChannelActions.updateChannelNotifyProps(userId, channelId, {
        mark_unread: NotificationLevels.MENTION,
    });
}

export function fetchChannelsAndMembers(teamId: Team['id'] = ''): ActionFunc<{channels: ServerChannel[]; channelMembers: ChannelMembership[]}> {
    return async (dispatch, getState) => {
        let channelsAndMembers: ChannelsAndChannelMembersQueryResponseType['data'] | null = null;
        try {
            if (teamId) {
                const {data} = await Client4.fetchWithGraphQL<ChannelsAndChannelMembersQueryResponseType>(getTeamsChannelsAndMembersQueryString(teamId));
                channelsAndMembers = data;
            } else {
                const {data} = await Client4.fetchWithGraphQL<ChannelsAndChannelMembersQueryResponseType>(getAllChannelsAndMembersQueryString());
                channelsAndMembers = data;
            }
        } catch (error) {
            dispatch(logError(error as ServerError));
            return {error: error as ServerError};
        }

        if (!channelsAndMembers) {
            return {data: {channels: [], channelMembers: []}};
        }

        const state = getState();
        const currentUserId = getCurrentUserId(state);

        const channels = transformToReceivedChannelsReducerPayload(channelsAndMembers.channels);
        const channelMembers = transformToReceivedChannelMembersReducerPayload(channelsAndMembers.channelMembers, currentUserId);

        await dispatch(batchActions([
            {
                type: ChannelTypes.RECEIVED_ALL_CHANNELS,
                data: channels,
            },
            {
                type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS,
                data: channelMembers,
                currentUserId,
            },
        ]));

        // Add any pending roles for the current team's channels
        const roles = new Set<string>();
        if (teamId) {
            channelsAndMembers.channelMembers.forEach((channelMember) => {
                if (channelMember.roles && channelMember.roles.length > 0) {
                    channelMember.roles.forEach((role) => {
                        roles.add(role.name);
                    });
                }
            });

            if (roles.size > 0) {
                dispatch(loadRolesIfNeeded(roles));
            }
        }

        return {data: {channels, channelMembers}};
    };
}
