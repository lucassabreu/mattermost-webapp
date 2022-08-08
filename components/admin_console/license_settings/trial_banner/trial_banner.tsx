// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';

import {savePreferences} from 'mattermost-redux/actions/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {PreferenceType} from '@mattermost/types/preferences';
import {makeGetCategory} from 'mattermost-redux/selectors/entities/preferences';

import AlertBanner from 'components/alert_banner';
import LoadingWrapper from 'components/widgets/loading/loading_wrapper';
import FormattedMarkdownMessage from 'components/formatted_markdown_message.jsx';

import {format} from 'utils/markdown';

import {LicenseLinks, Preferences, Unique} from 'utils/constants';

import {GlobalState} from 'types/store';
import store from 'stores/redux_store.jsx';

interface TrialBannerProps {
    isDisabled: boolean;
    gettingTrialError: string | null;
    gettingTrialResponseCode: number | null;
    requestLicense: (e?: React.MouseEvent<HTMLButtonElement>, reload?: boolean) => Promise<void>;
    gettingTrial: boolean;
    enterpriseReady: boolean;
    upgradingPercentage: number;
    handleUpgrade: () => Promise<void>;
    upgradeError: string | null;
    restartError: string | null;

    handleRestart: () => Promise<void>;

    openEEModal: () => void;

    restarting: boolean;
}

export const EmbargoedEntityTrialError = () => {
    return (
        <FormattedMessage
            id='admin.license.trial-request.embargoed'
            defaultMessage='We were unable to process the request due to limitations for embargoed countries. <link>Learn more in our documentation</link>, or reach out to legal@mattermost.com for questions around export limitations.'
            values={{
                link: (text: string) => (
                    <a href={LicenseLinks.EMBARGOED_COUNTRIES}>
                        {text}
                    </a>
                ),
            }}
        />
    );
};

enum TrialLoadStatus {
    NotStarted = 'NOT_STARTED',
    Started = 'STARTED',
    Success = 'SUCCESS',
    Failed = 'FAILED',
    Embargoed = 'EMBARGOED',
}

const TrialBanner = ({
    isDisabled,
    gettingTrialError,
    gettingTrialResponseCode,
    requestLicense,
    gettingTrial,
    enterpriseReady,
    upgradingPercentage,
    handleUpgrade,
    upgradeError,
    restartError,
    handleRestart,
    restarting,
    openEEModal,
}: TrialBannerProps) => {
    let trialButton;
    let upgradeTermsMessage;
    let content;
    let gettingTrialErrorMsg;

    const {formatMessage} = useIntl();
    const state = store.getState();
    const getCategory = makeGetCategory();
    const preferences = getCategory(state, Preferences.UNIQUE);
    const restartedAfterUpgradePrefValue = preferences.find((pref: PreferenceType) => pref.name === Unique.REQUEST_TRIAL_AFTER_SERVER_UPGRADE);
    const clickedUpgradeAndStartTrialBtn = preferences.find((pref: PreferenceType) => pref.name === Unique.CLICKED_UPGRADE_AND_TRIAL_BTN);

    const restartedAfterUpgradePrefs = restartedAfterUpgradePrefValue?.value === 'true';
    const clickedUpgradeAndTrialBtn = clickedUpgradeAndStartTrialBtn?.value === 'true';

    const userId = useSelector((state: GlobalState) => getCurrentUserId(state));

    const [status, setLoadStatus] = useState(TrialLoadStatus.NotStarted);

    const dispatch = useDispatch();

    const btnText = (status: TrialLoadStatus): string => {
        switch (status) {
        case TrialLoadStatus.Started:
            return formatMessage({id: 'start_trial.modal.gettingTrial', defaultMessage: 'Getting Trial...'});
        case TrialLoadStatus.Success:
            return formatMessage({id: 'start_trial.modal.loaded', defaultMessage: 'Loaded!'});
        case TrialLoadStatus.Failed:
            return formatMessage({id: 'start_trial.modal.failed', defaultMessage: 'Failed'});
        case TrialLoadStatus.Embargoed:
            return formatMessage({id: 'admin.license.trial-request.embargoed'});
        default:
            return formatMessage({id: 'admin.license.trial-request.startTrial', defaultMessage: 'Start trial'});
        }
    };

    useEffect(() => {
        async function savePrefsAndRequestTrial() {
            await savePrefsRestartedAfterUpgrade();
            handleRestart();
        }
        if (upgradingPercentage === 100 && clickedUpgradeAndTrialBtn) {
            if (!restarting) {
                savePrefsAndRequestTrial();
            }
        }
    }, [upgradingPercentage, clickedUpgradeAndTrialBtn]);

    useEffect(() => {
        if (gettingTrial && !gettingTrialError && gettingTrialResponseCode !== 200) {
            setLoadStatus(TrialLoadStatus.Started);
        } else if (gettingTrialError) {
            setLoadStatus(TrialLoadStatus.Failed);
        } else if (gettingTrialResponseCode === 451) {
            setLoadStatus(TrialLoadStatus.Embargoed);
        }
    }, [gettingTrial, gettingTrialError, gettingTrialResponseCode]);

    useEffect(() => {
        // validating the percentage in 0 we make sure to only remove the prefs value on component load after restart
        if (restartedAfterUpgradePrefs && clickedUpgradeAndTrialBtn && upgradingPercentage === 0) {
            // remove the values from the preferences
            const category = Preferences.UNIQUE;
            const reqLicense = Unique.REQUEST_TRIAL_AFTER_SERVER_UPGRADE;
            const clickedBtn = Unique.CLICKED_UPGRADE_AND_TRIAL_BTN;
            dispatch(savePreferences(userId, [{category, name: reqLicense, user_id: userId, value: ''}, {category, name: clickedBtn, user_id: userId, value: ''}]));

            requestLicense();
        }
    }, [restartedAfterUpgradePrefs, clickedUpgradeAndTrialBtn]);

    const onHandleUpgrade = () => {
        if (!handleUpgrade) {
            return;
        }
        handleUpgrade();
        const category = Preferences.UNIQUE;
        const name = Unique.CLICKED_UPGRADE_AND_TRIAL_BTN;
        dispatch(savePreferences(userId, [{category, name, user_id: userId, value: 'true'}]));
    };

    const savePrefsRestartedAfterUpgrade = () => {
        // save in the preferences that this customer wanted to request trial just after the upgrade
        const category = Preferences.UNIQUE;
        const name = Unique.REQUEST_TRIAL_AFTER_SERVER_UPGRADE;
        dispatch(savePreferences(userId, [{category, name, user_id: userId, value: 'true'}]));
    };

    const eeModalTerms = (
        <a
            role='button'
            onClick={openEEModal}
        >
            <FormattedMarkdownMessage
                id='admin.license.enterprise.upgrade.eeLicenseLink'
                defaultMessage='Enterprise Edition License'
            />
        </a>
    );
    if (enterpriseReady && !restartedAfterUpgradePrefs) {
        if (gettingTrialError) {
            gettingTrialErrorMsg =
                gettingTrialResponseCode === 451 ? (
                    <div className='trial-error'>
                        <EmbargoedEntityTrialError/>
                    </div>
                ) : (
                    <p className='trial-error'>
                        <FormattedMessage
                            id='admin.trial_banner.trial-request.error'
                            defaultMessage='Trial license could not be retrieved. Visit <link>{trialInfoLink}</link> to request a license.'
                            values={{
                                link: (msg: React.ReactNode) => (
                                    <a
                                        href={LicenseLinks.TRIAL_INFO_LINK}
                                        target='_blank'
                                        rel='noreferrer'
                                    >
                                        {msg}
                                    </a>
                                ),
                                trialInfoLink: LicenseLinks.TRIAL_INFO_LINK,
                            }}
                        />
                    </p>
                );
        }
        trialButton = (
            <button
                type='button'
                className='btn btn-primary'
                onClick={requestLicense}
                disabled={isDisabled || gettingTrialError !== null || gettingTrialResponseCode === 451}
            >
                {btnText(status)}
            </button>
        );
        content = (
            <>
                <FormattedMessage
                    id='admin.license.trial-request.title'
                    defaultMessage='Experience Mattermost Enterprise Edition for free for the next 30 days. No obligation to buy or credit card required. '
                />
                <FormattedMessage
                    id='admin.license.trial-request.accept-terms'
                    defaultMessage='By clicking <strong>Start trial</strong>, I agree to the <linkEvaluation>Mattermost Software Evaluation Agreement</linkEvaluation>, <linkPrivacy>Privacy Policy</linkPrivacy>, and receiving product emails.'
                    values={{
                        strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
                        linkEvaluation: (msg: React.ReactNode) => (
                            <a
                                href='https://mattermost.com/software-evaluation-agreement'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {msg}
                            </a>
                        ),
                        linkPrivacy: (msg: React.ReactNode) => (
                            <a
                                href='https://mattermost.com/privacy-policy/'
                                target='_blank'
                                rel='noreferrer'
                            >
                                {msg}
                            </a>
                        ),
                    }}
                />
            </>
        );
        upgradeTermsMessage = null;
    } else {
        gettingTrialErrorMsg = null;
        trialButton = (
            <button
                type='button'
                onClick={onHandleUpgrade}
                className='btn btn-primary'
            >
                <LoadingWrapper
                    loading={upgradingPercentage > 0}
                    text={upgradingPercentage === 100 && restarting ? (
                        <FormattedMessage
                            id='admin.license.enterprise.restarting'
                            defaultMessage='Restarting'
                        />
                    ) : (
                        <FormattedMessage
                            id='admin.license.enterprise.upgrading'
                            defaultMessage='Upgrading {percentage}%'
                            values={{percentage: upgradingPercentage}}
                        />)}
                >
                    <FormattedMessage
                        id='admin.license.trialUpgradeAndRequest.submit'
                        defaultMessage='Upgrade Server And Start trial'
                    />
                </LoadingWrapper>
            </button>
        );

        content = (
            <>
                <FormattedMessage
                    id='admin.license.upgrade-and-trial-request.title'
                    defaultMessage='Upgrade to Enterprise Edition and Experience Mattermost Enterprise Edition for free for the next 30 days. No obligation to buy or credit card required. '
                />
            </>
        );

        upgradeTermsMessage = (
            <>
                <p className='upgrade-legal-terms'>
                    <FormattedMessage
                        id='admin.license.upgrade-and-trial-request.accept-terms-initial-part'
                        defaultMessage='By selecting <strong>Upgrade Server And Start trial</strong>, I agree to the <linkEvaluation>Mattermost Software Evaluation Agreement</linkEvaluation>, <linkPrivacy>Privacy Policy</linkPrivacy>, and receiving product emails. '
                        values={{
                            strong: (msg: React.ReactNode) => <strong>{msg}</strong>,
                            linkEvaluation: (msg: React.ReactNode) => (
                                <a
                                    href='https://mattermost.com/software-evaluation-agreement/'
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    {msg}
                                </a>
                            ),
                            linkPrivacy: (msg: React.ReactNode) => (
                                <a
                                    href='https://mattermost.com/privacy-policy/'
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    {msg}
                                </a>
                            ),
                        }}
                    />
                    <FormattedMessage
                        id='admin.license.upgrade-and-trial-request.accept-terms-final-part'
                        defaultMessage='Also, I agree to the terms of the Mattermost {eeModalTerms}. Upgrading will download the binary and update your Team Edition instance.'
                        values={{eeModalTerms}}
                    />
                </p>
                {upgradeError && (
                    <div className='upgrade-error'>
                        <div className='form-group has-error'>
                            <label className='control-label'>
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: format(upgradeError),
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                )}
                {restartError && (
                    <div className='col-sm-12'>
                        <div className='form-group has-error'>
                            <label className='control-label'>
                                {restartError}
                            </label>
                        </div>
                    </div>
                )}
            </>
        );
    }
    return (
        <AlertBanner
            mode='info'
            title={
                <FormattedMessage
                    id='licensingPage.infoBanner.startTrialTitle'
                    defaultMessage='Free 30 day trial!'
                />
            }
            message={
                <div className='banner-start-trial'>
                    <p className='license-trial-legal-terms'>
                        {content}
                    </p>
                    <div className='trial'>
                        {trialButton}
                    </div>
                    {upgradeTermsMessage}
                    {gettingTrialErrorMsg}
                </div>
            }
        />
    );
};

export default TrialBanner;
