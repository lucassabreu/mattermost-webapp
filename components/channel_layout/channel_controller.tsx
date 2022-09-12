// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';

import Pluggable from 'plugins/pluggable';

import ResetStatusModal from 'components/reset_status_modal';
import CenterChannel from 'components/channel_layout/center_channel';
import LoadingScreen from 'components/loading_screen';
import FaviconTitleHandler from 'components/favicon_title_handler';
import ProductNoticesModal from 'components/product_notices_modal';

import {isInternetExplorer, isEdge} from 'utils/user_agent';

interface Props {
    fetchingChannels: boolean;
}

const BODY_CLASS_FOR_CHANNEL = ['app__body', 'channel-view'];

export default function ChannelController({fetchingChannels}: Props) {
    useEffect(() => {
        const isMsBrowser = isInternetExplorer() || isEdge();
        const platform = window.navigator.platform;
        document.body.classList.add(...getClassnamesForBody(platform, isMsBrowser));

        return () => {
            document.body.classList.remove(...BODY_CLASS_FOR_CHANNEL);
        };
    }, []);

    return (
        <div
            id='channel_view'
            className='channel-view'
        >

            <FaviconTitleHandler/>
            <ProductNoticesModal/>
            <div className='container-fluid channel-view-inner'>
                {fetchingChannels ? <LoadingScreen/> : <CenterChannel/>}
                <Pluggable pluggableName='Root'/>
                <ResetStatusModal/>
            </div>
        </div>
    );
}

export function getClassnamesForBody(platform: Window['navigator']['platform'], isMsBrowser = false) {
    const bodyClass = [...BODY_CLASS_FOR_CHANNEL];

    // OS Detection
    if (platform === 'Win32' || platform === 'Win64') {
        bodyClass.push('os--windows');
    } else if (platform === 'MacIntel' || platform === 'MacPPC') {
        bodyClass.push('os--mac');
    }

    // IE Detection
    if (isMsBrowser) {
        bodyClass.push('browser--ie');
    }

    return bodyClass;
}
