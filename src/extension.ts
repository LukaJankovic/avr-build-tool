// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { TextEncoder } from 'util';
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	/*
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "avr-build-tool" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('avr-build-tool.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from AVR Build Tool!');
	});

	context.subscriptions.push(disposable);
	*/
	var term: vscode.Terminal;
	var buildSrcPath: vscode.Uri;
	var buildOutPath: vscode.Uri;

	let avrBuild = vscode.commands.registerCommand('avr-build-tool.build', () => {
		vscode.window.showInputBox({ title: "Enter avra includedir (Get default from avra --help)" }).then(async path => {
			try {
				let files = new Array();

				for (const [name, type] of await vscode.workspace.fs.readDirectory(vscode.Uri.parse(String(path)))) {
					files.push(name);
				};

				vscode.window.showQuickPick(files).then(device => {
					let src = vscode.window.activeTextEditor?.document.fileName.split('.')[0].split('/').slice(-1);
					console.log(src);
					var path;

					if (vscode.workspace.workspaceFolders !== undefined) {
						path = vscode.workspace.workspaceFolders[0].uri;
					} else {
						vscode.window.showErrorMessage('Unable to retrieve workspace path');
						return;
					}

					vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(path, '.vscode', 'avr.build'));

					let enc = new TextEncoder();
					let content = enc.encode('.include \"'+device+'\"\n.include \"'+src+'.asm\"');
					buildSrcPath = vscode.Uri.joinPath(path, '.vscode', 'avr.build', src + '-build.asm');
					buildOutPath = vscode.Uri.joinPath(path, '.vscode', 'avr.build', src + '-build.hex');
					vscode.workspace.fs.writeFile(buildSrcPath, content);

					if (!term)
						term = vscode.window.createTerminal();

					term.sendText('avra ' + buildSrcPath.fsPath);
				})
			} catch (err) {
				vscode.window.showErrorMessage('Invalid includedir path!');
			};
		});
	});

	let avrSend = vscode.commands.registerCommand('avr-build-tool.send', () => {
		vscode.window.showInputBox({ title: "Enter device name"}).then(name => {
			vscode.window.showInputBox({ title: "Enter device path (Use Arduino IDE->Tools)" }).then(path => {
				vscode.window.showInputBox({ title: "Enter baud rate", value: "115200" }).then(baud => {
					if (!term)
						term = vscode.window.createTerminal();

					term.sendText("avrdude -p "+name+" -c arduino -P "+path+" -b "+baud+" -U flash:w:"+buildOutPath+":i");
				})
			})
		})
	})

	context.subscriptions.push(avrBuild);
	context.subscriptions.push(avrSend);
}

// this method is called when your extension is deactivated
export function deactivate() {}
