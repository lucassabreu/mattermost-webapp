// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {FormattedMessage} from 'react-intl';

import SectionItemCreator, {SectionItemProps} from './section_item_creator';

export type FieldsetCheckbox = {
    dataTestId?: string;
    title: {
        id: string;
        defaultMessage: string;
    };
    name: string;
}

type Props = SectionItemProps & {
    inputFieldData: FieldsetCheckbox;
    inputFieldValue: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
function CheckboxItemCreator({
    title,
    description,
    inputFieldData,
    inputFieldValue,
    handleChange,
}: Props): JSX.Element {
    const content = (
        <fieldset
            key={inputFieldData.name}
            className='mm-modal-generic-section-item__fieldset-checkbox'
        >
            <input
                className='mm-modal-generic-section-item__input-checkbox'
                data-testid={inputFieldData.dataTestId}
                type='checkbox'
                name={inputFieldData.name}
                checked={inputFieldValue}
                onChange={handleChange}
            />
            <FormattedMessage
                id={inputFieldData.title.id}
                defaultMessage={inputFieldData.title.defaultMessage}
            />
            <br/>
        </fieldset>
    );
    return (
        <SectionItemCreator
            content={content}
            title={title}
            description={description}
        />
    );
}

export default CheckboxItemCreator;
