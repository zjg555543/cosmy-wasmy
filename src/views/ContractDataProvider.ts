import * as vscode from 'vscode';
import { Constants } from '../constants';
import { Contract } from '../models/Contract';
import { ContractSortOrder, Workspace } from '../helpers/Workspace';


export class ContractDataProvider implements vscode.TreeDataProvider<Contract> {

	private contracts: Contract[];

	/**
	 *
	 */
	constructor() {
		this.contracts = [];
	}

	private _onDidChangeTreeData: vscode.EventEmitter<void | Contract | Contract[] | null | undefined> = new vscode.EventEmitter<void | Contract | Contract[] | null | undefined>();
	readonly onDidChangeTreeData: vscode.Event<void | Contract | Contract[] | null | undefined> = this._onDidChangeTreeData.event;


	refresh(contracts: Contract[]): void {
		this.contracts = contracts.filter(c => !c.chainConfig || c.chainConfig == "" || c.chainConfig == Workspace.GetWorkspaceChainConfig().configName);
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(contract: Contract): vscode.TreeItem | Thenable<vscode.TreeItem> {
		switch (Workspace.GetContractSortOrder()) {

			case ContractSortOrder.Alphabetical: { formatContractViewItem(); }
			break;

			case ContractSortOrder.CodeId: {
				if (contract.contractAddress) { formatContractViewItem(); }
				else { formatContractCodeViewItem(); }
			}
			break;

			case ContractSortOrder.None:
			default: { formatContractViewItem(); }
			break;
		}
		return contract;

		function formatContractViewItem() {
			contract.id = contract.contractAddress.toString();
			contract.label = contract.codeId.toString() + ": " + contract.label;
			contract.description = contract.contractAddress;
			contract.tooltip = getContractTooltip();
			contract.contextValue = Constants.VIEWS_CONTRACT;
			contract.iconPath = contract.chainConfig == Workspace.GetWorkspaceChainConfig().configName ?  "" : new vscode.ThemeIcon("debug-disconnect");
			contract.command = {
				title: "Select Contract",
				command: "cosmy-wasmy.selectContract",
				arguments: [contract]
			};
		}

		function getContractTooltip(): string | vscode.MarkdownString | undefined {
			let tooltip = "Address: " + contract.contractAddress;
			tooltip += "\n";
			tooltip += "Creator: " + contract.creator;
			if(contract.notes && contract.notes.trim().length > 0) {
				tooltip += "\n\n"  + contract.notes;
			}
			if(contract.chainConfig != Workspace.GetWorkspaceChainConfig().configName) {
				tooltip += "\n\n";
				tooltip += "$(alert) *The imported contracts are not associated with any of the configured chains. Delete and reimport the contract to fix this.*";		
			}
			return new vscode.MarkdownString(tooltip, true);
		}

		function formatContractCodeViewItem() {
			contract.id = contract.codeId.toString();
			contract.label = "Code: " + contract.codeId.toString();
			contract.description = "";
			contract.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
		}
	}

	getChildren(element?: Contract): vscode.ProviderResult<Contract[]> {
		switch (Workspace.GetContractSortOrder()) {
			case ContractSortOrder.Alphabetical: { if (!element) { return this.contracts.sort((c1, c2) => 
				(c1.label.toLowerCase() > c2.label.toLowerCase()) ? 1 : ((c2.label.toLowerCase() > c1.label.toLowerCase()) ? -1 : 0)); } }
			break;

			case ContractSortOrder.CodeId: {
				if (element) { return this.getContractsByCode(element.codeId); }
				else { return this.getCodeIds(); }
			}
			break;

			case ContractSortOrder.None:
			default: { if (!element) { return this.contracts; } }
			break;
		}
	}

	private getContractsByCode(codeId: number): Contract[] {
		return this.contracts.filter(c => c.codeId == codeId);
	}

	private getCodeIds(): Contract[] {
		let codeIds = [...new Set(this.contracts.map(c => c.codeId))].sort((a, b) => a - b);
		return codeIds.map(c => new Contract(c.toString(), "", c, "", ""));
	}

}
