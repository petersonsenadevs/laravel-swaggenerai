import * as vscode from 'vscode';
import { generateDocs } from './commands/generateCommand';
import { editApiKey } from './commands/editApiKeyCommand';
import { ollamaCommands } from './commands/ollamaCommands';

import { selectAIProvider } from './commands/selectProviderCommand';
import { FolderSelectionViewProvider } from './views/folderSelectionViewProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Laravel SwaggenerAI is now active');

    // Registrar comandos
    const generateCommand = vscode.commands.registerCommand(
        'laravel-swaggenerai.generateDocs', 
        generateDocs
    );


    const editApiKeyCommand = vscode.commands.registerCommand(
        'laravel-swaggenerai.editApiKey', 
        editApiKey
    );
       const selectProviderCommand = vscode.commands.registerCommand(
        'laravel-swaggenerai.selectProvider',
        selectAIProvider
    );
    const ollamaCommand = vscode.commands.registerCommand(
        'laravel-swaggenerai.ollamaCommands',
        ollamaCommands
    );



    // Registrar todos los comandos
    context.subscriptions.push(generateCommand, editApiKeyCommand, selectProviderCommand, ollamaCommand);

    // Registrar el WebviewViewProvider para la barra lateral
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            FolderSelectionViewProvider.viewType,
            new FolderSelectionViewProvider(context)
        )
    );
}

export function deactivate() {
    // Cleanup si es necesario
}