// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { TextDecoder, TextEncoder } from 'util';
import { getHeapSnapshot } from 'v8';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let prefs = {
			"libPath": "",
			"libDevice": "",
			"deviceName": "",
			"devicePath": "",
			"baudRate": ""
				};

	var term: vscode.Terminal;
	var src: string;
	var buildSrcPath: vscode.Uri; 
	var buildOutPath: vscode.Uri;

	function getPath() {
		var path: vscode.Uri;

		if (vscode.workspace.workspaceFolders !== undefined) {
			path = vscode.workspace.workspaceFolders[0].uri;
		} else {
			vscode.window.showErrorMessage('Unable to retrieve workspace path');
			path = vscode.Uri.parse('');
		}

		return path;
	}

	async function getPrefs() {
		let path = getPath();
		let settingsPath = vscode.Uri.joinPath(path, '.vscode', 'avrbuild.json');
		let data = vscode.workspace.fs.readFile(settingsPath);
		prefs = JSON.parse(new TextDecoder().decode(await data));

		if (prefs == undefined) {
			prefs = {
				"libPath": "",
				"libDevice": "",
				"deviceName": "",
				"devicePath": "",
				"baudRate": ""
					};
			savePrefs();
		}
	}

	function savePrefs() {
		let path = getPath();
		let settingsPath = vscode.Uri.joinPath(path, '.vscode', 'avrbuild.json');
		let outData = JSON.stringify(prefs);
		console.log(outData);
		vscode.workspace.fs.writeFile(settingsPath, new TextEncoder().encode(outData));
	}

	async function showDevices() {

		let files = new Array();
		for (const [name, type] of await vscode.workspace.fs.readDirectory(vscode.Uri.parse(String(prefs['libPath'])))) {
			files.push(name);
		};

		vscode.window.showQuickPick(files).then(device => {
			prefs['libDevice'] = device;
			savePrefs();
			writeAndBuild();
		});
	}

	function writeAndBuild() {
		src = String(vscode.window.activeTextEditor?.document.fileName.split('.')[0].split('/').slice(-1));

		let path = getPath();
		vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(path, '.vscode', 'avr.build'));

		let content = new TextEncoder().encode('.include \"'+prefs['libDevice']+'\"\n.include \"'+src+'.asm\"');
		buildSrcPath = vscode.Uri.joinPath(path, '.vscode', 'avr.build', src + '-build.asm');
		buildOutPath = vscode.Uri.joinPath(path, '.vscode', 'avr.build', src + '-build.hex');
		vscode.workspace.fs.writeFile(buildSrcPath, content);

		if (!term)
			term = vscode.window.createTerminal();

		term.sendText('avra ' + buildSrcPath.fsPath);
	}

	function buildAvr() {
		if (!prefs['libPath']) {
			vscode.window.showInputBox({ title: "Enter avra includedir (Get default from avra --help)" }).then(path => {
				if (path != undefined) {
					prefs['libPath'] = path;
					savePrefs();

					if (!prefs['libDevice']) {
						showDevices();
					} else {
						writeAndBuild();
					}
				}
			});
		} else {
			if (!prefs['libDevice']) {
				showDevices();
			} else {
				writeAndBuild();
			}
		}
	}

	function sendCommand() {
		if (!term)
			term = vscode.window.createTerminal();

		term.sendText("avrdude -p "+prefs['deviceName']+" -c arduino -P "+prefs['devicePath']+" -b "+prefs['baudRate']+" -U flash:w:"+buildOutPath.fsPath+":i");
	}

	function getBaudRate() {
		if (!prefs['baudRate']) {
			vscode.window.showInputBox({ title: "Enter baud rate", value: "115200" }).then(baud => {
				if (baud != undefined) {
					prefs['baudRate'] = baud;
					savePrefs();
				}
				sendCommand();
			});
		} else {
			sendCommand();
		}
	}

	function getDevicePath() {
		if (!prefs['devicePath']) {
			vscode.window.showInputBox({ title: "Enter device path (Use Arduino IDE->Tools)" }).then(path => {
				if (path != undefined) {
					prefs['devicePath'] = path;
					savePrefs();
				}
				getBaudRate();
			});
		} else {
			getBaudRate();
		}
	}

	function getDeviceName() {
		if (!prefs['deviceName']) {
			vscode.window.showInputBox({ title: "Enter device name"}).then(name => {
				if (name != undefined) {
					prefs['deviceName'] = name;
					savePrefs();
				}
				getDevicePath();
			});
		} else {
			getDevicePath();
		}
	}

	function pushAvr() {
		buildAvr();
		getDeviceName();
	}

	context.subscriptions.push(vscode.commands.registerCommand('avr-build-tool.build', () => {
		getPrefs();
		buildAvr();
		})
	);

	context.subscriptions.push(vscode.commands.registerCommand('avr-build-tool.send', () => {
		getPrefs();
		pushAvr();
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
