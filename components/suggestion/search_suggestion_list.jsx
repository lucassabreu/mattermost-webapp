// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FormattedMessage} from 'react-intl';

import Constants from 'utils/constants';

import Popover from 'components/widgets/popover';

import {SuggestionListClass} from './suggestion_list.tsx';

export default class SearchSuggestionList extends SuggestionListClass {
    static propTypes = {
        ...SuggestionListClass.propTypes,
    };

    constructor(props) {
        super(props);

        this.itemRefs = new Map();
        this.popoverRef = React.createRef();
        this.itemsContainerRef = React.createRef();
        this.suggestionReadOut = React.createRef();
    }

    generateLabel(item) {
        if (item.username) {
            this.currentLabel = item.username;
            if ((item.first_name || item.last_name) && item.nickname) {
                this.currentLabel += ` ${item.first_name} ${item.last_name} ${item.nickname}`;
            } else if (item.nickname) {
                this.currentLabel += ` ${item.nickname}`;
            } else if (item.first_name || item.last_name) {
                this.currentLabel += ` ${item.first_name} ${item.last_name}`;
            }
        } else if (item.type === Constants.DM_CHANNEL || item.type === Constants.GM_CHANNEL) {
            this.currentLabel = item.display_name;
        } else {
            this.currentLabel = item.name;
        }

        if (this.currentLabel) {
            this.currentLabel = this.currentLabel.toLowerCase();
        }

        this.announceLabel();
    }

    getContent = () => {
        return this.itemsContainerRef.current?.parentNode;
    }

    renderChannelDivider(type) {
        let text;
        if (type === Constants.OPEN_CHANNEL) {
            text = (
                <FormattedMessage
                    id='suggestion.search.public'
                    defaultMessage='Public Channels'
                />
            );
        } else if (type === Constants.PRIVATE_CHANNEL) {
            text = (
                <FormattedMessage
                    id='suggestion.search.private'
                    defaultMessage='Private Channels'
                />
            );
        } else {
            text = (
                <FormattedMessage
                    id='suggestion.search.direct'
                    defaultMessage='Direct Messages'
                />
            );
        }

        return (
            <div
                key={type + '-divider'}
                className='search-autocomplete__divider'
            >
                <span>{text}</span>
            </div>
        );
    }

    render() {
        if (this.props.items.length === 0) {
            return null;
        }

        const items = [];
        let haveDMDivider = false;
        for (let i = 0; i < this.props.items.length; i++) {
            const item = this.props.items[i];
            const term = this.props.terms[i];
            const isSelection = term === this.props.selection;

            // ReactComponent names need to be upper case when used in JSX
            const Component = this.props.components[i];

            // temporary hack to add dividers between public and private channels in the search suggestion list
            if (this.props.renderDividers) {
                if (i === 0 || item.type !== this.props.items[i - 1].type) {
                    if (item.type === Constants.DM_CHANNEL || item.type === Constants.GM_CHANNEL) {
                        if (!haveDMDivider) {
                            items.push(this.renderChannelDivider(Constants.DM_CHANNEL));
                        }
                        haveDMDivider = true;
                    } else if (item.type === Constants.PRIVATE_CHANNEL) {
                        items.push(this.renderChannelDivider(Constants.PRIVATE_CHANNEL));
                    } else if (item.type === Constants.OPEN_CHANNEL) {
                        items.push(this.renderChannelDivider(Constants.OPEN_CHANNEL));
                    }
                }
            }

            if (isSelection) {
                this.currentItem = item;
            }

            items.push(
                <Component
                    key={term}
                    ref={(ref) => this.itemRefs.set(term, ref)}
                    item={item}
                    term={term}
                    matchedPretext={this.props.matchedPretext[i]}
                    isSelection={isSelection}
                    onClick={this.props.onCompleteWord}
                    onMouseMove={this.props.onItemHover}
                />,
            );
        }

        return (
            <Popover
                ref={this.popoverRef}
                id='search-autocomplete__popover'
                className='search-help-popover autocomplete visible'
                placement='bottom'
            >
                <div
                    ref={this.suggestionReadOut}
                    aria-live='polite'
                    className='hidden-label'
                />
                <div ref={this.itemsContainerRef}>
                    {items}
                </div>
            </Popover>
        );
    }
}
