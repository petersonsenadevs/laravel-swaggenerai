import * as vscode from 'vscode';
import { generateDocs } from './commands/generateCommand';
import { editApiKey } from './commands/editApiKeyCommand';

import { selectAIProvider } from './commands/selectProviderCommand';

export function activate(context: vscode.ExtensionContext) {
    console.log('Laravel Swagger AI Generator is now active');

    // Registrar comandos
    const generateCommand = vscode.commands.registerCommand(
        'laravel-swagger-ai-generator.generateDocs', 
        generateDocs
    );


    const editApiKeyCommand = vscode.commands.registerCommand(
        'laravel-swagger-ai-generator.editApiKey', 
        editApiKey
    );
       const selectProviderCommand = vscode.commands.registerCommand(
        'laravel-swagger-ai-generator.selectProvider',
        selectAIProvider
    );



    // Registrar todos los comandos
    context.subscriptions.push(generateCommand, editApiKeyCommand, selectProviderCommand);
}

export function deactivate() {
    // Cleanup si es necesario
}