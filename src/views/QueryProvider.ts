import * as vscode from 'vscode';
import { Workspace } from '../helpers/Workspace';
import { Constants } from '../constants';
import { Cosmwasm } from '../helpers/CosmwasmAPI';
import { ResponseHandler } from '../helpers/ResponseHandler';
import { HistoryHandler } from '../helpers/HistoryHandler';
import { Contract } from '../models/Contract';


export class QueryProvider implements vscode.WebviewViewProvider {


	private _view?: vscode.WebviewView;


	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly context: vscode.Memento
	) { }

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'exec-text':
					{
						const contract = Workspace.GetSelectedContract();
						if (!contract) {
							vscode.window.showErrorMessage("No contract selected. Select a contract in the Contracts view.");
							return;
						}
						try {
							JSON.parse(data.value);
						} catch {
							vscode.window.showErrorMessage("The input is not valid JSON");
							return;
						}
						this.execQuery(data, contract);
					}
			}
		});
	}

	private execQuery(data: any, contract: Contract) {
		const query = JSON.parse(data.value);
		HistoryHandler.RecordAction(this.context, contract, Constants.VIEWS_QUERY, data.value);
		vscode.window.withProgress({
			location: { viewId: Constants.VIEWS_QUERY },
			title: "Querying the contract - " + contract.label,
			cancellable: false
		}, (progress, token) => {
			token.onCancellationRequested(() => { });
			progress.report({ message: '' });
			return new Promise(async (resolve, reject) => {
				try {
					let resp = await Cosmwasm.Client.queryContractSmart(contract.contractAddress, query);
					ResponseHandler.OutputSuccess(JSON.stringify(query, null, 4), JSON.stringify(resp, null, 4), "Query");
					resolve(undefined);
				}
				catch (err: any) {
					ResponseHandler.OutputError(JSON.stringify(query, null, 4), err, "Query");
					reject(undefined);
				}
			});
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {

		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" style-src ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>Query Page</title>
			</head>
			<body>
				<textarea id="input-text" placeholder="{'get_count':{}}"></textarea>
				<button id="exec-button">Query</button>
				<script>
				(function () {
					const vscode = acquireVsCodeApi();
					document.querySelector('#exec-button').addEventListener('click', () => {
						const input = document.getElementById('input-text').value;
						vscode.postMessage({ type: 'exec-text', value: input });
					});
				}());
				</script>
			</body>
			</html>`;
	}

}