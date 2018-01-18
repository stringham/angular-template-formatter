'use strict';
import {DocumentSelector, window, ExtensionContext, languages} from 'vscode';
import {EditProvider} from './formatter';

const VALID_LANG: DocumentSelector = 'html';

export function activate(context: ExtensionContext) {
    const editProvider = new EditProvider();

    console.log('angular template formatter: activated');

    context.subscriptions.push(
        languages.registerDocumentFormattingEditProvider(VALID_LANG, editProvider)
    );
}

export function deactivate() {
}
