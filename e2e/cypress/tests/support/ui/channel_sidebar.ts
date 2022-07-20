// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChainableT} from '../api/types';

import {getRandomId} from '../../utils';

function uiCreateSidebarCategory(categoryName = `category-${getRandomId()}`): ChainableT<{displayName: string}> {
    // # Click the New Category/Channel Dropdown button
    cy.uiGetLHSAddChannelButton().click();

    // # Click the Create New Category dropdown item
    cy.get('.AddChannelDropdown').should('be.visible').contains('.MenuItem', 'Create New Category').click();

    cy.findByRole('dialog', {name: 'Rename Category'}).should('be.visible').within(() => {
        // # Fill in the category name and click 'Create'
        cy.findByRole('textbox').should('be.visible').typeWithForce(categoryName).
            invoke('val').should('equal', categoryName);
        cy.findByRole('button', {name: 'Create'}).should('be.enabled').click();
    });

    // * Wait for the category to appear in the sidebar
    cy.contains('.SidebarChannelGroup', categoryName, {matchCase: false});

    return cy.wrap({displayName: categoryName});
}
Cypress.Commands.add('uiCreateSidebarCategory', uiCreateSidebarCategory);

function uiMoveChannelToCategory(channelName: string, categoryName = `category-${getRandomId()}`, newCategory = false): ChainableT<JQuery> {
    // Open the channel menu, select Move to, and click either New Category or on the category
    cy.get(`#sidebarItem_${channelName}`).find('.SidebarMenu_menuButton').click({force: true});
    cy.get('.SidebarMenu').contains('.SubMenuItem', 'Move to').
        contains(newCategory ? 'New Category' : categoryName, {matchCase: false}).
        click({force: true});

    if (newCategory) {
        cy.findByRole('dialog', {name: 'Rename Category'}).should('be.visible').within(() => {
            // # Fill in the category name and click 'Create'
            cy.findByRole('textbox').should('be.visible').typeWithForce(categoryName).
                invoke('val').should('equal', categoryName);
            cy.findByRole('button', {name: 'Create'}).should('be.enabled').click();
        });
    }

    // * Wait for the channel to appear in the category
    cy.contains('.SidebarChannelGroup', categoryName, {matchCase: false}).
        find(`#sidebarItem_${channelName}`).should('exist');

    return cy.contains('.SidebarChannelGroup', categoryName, {matchCase: false});
}
Cypress.Commands.add('uiMoveChannelToCategory', uiMoveChannelToCategory);
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable {
            uiCreateSidebarCategory: typeof uiCreateSidebarCategory;
            uiMoveChannelToCategory: typeof uiMoveChannelToCategory;
        }
    }
}
