// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import classNames from 'classnames';
import {useIntl} from 'react-intl';

import Tag from './tag';

type Props = {
    className?: string;
    show?: boolean;
};

const GuestTag = ({show = true, className = ''}: Props) => {
    const {formatMessage} = useIntl();
    return (
        <Tag
            className={classNames('GuestTag', className)}
            show={show}
            text={formatMessage({
                id: 'post_info.guest',
                defaultMessage: 'GUEST',
            })}
        />
    );
};

export default GuestTag;
