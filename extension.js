const vscode = require('vscode');
const retrieveConfluencePages = require('./retrieve-pages');
const authenticate = require('./authenticate');
const codify = require('./codify');
const updateOrCreatePage = require('./push-pages');

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {

    context.subscriptions.push(vscode.commands.registerCommand('dione.codify', async() => {await codify(context)}));
	context.subscriptions.push(vscode.commands.registerCommand('dione.authenticate', () => {authenticate(context)}));
	context.subscriptions.push(vscode.commands.registerCommand('dione.listPages', () => {retrieveConfluencePages(context)}));
	context.subscriptions.push(vscode.commands.registerCommand('dione.pushPages', () => {updateOrCreatePage(context)}));
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
