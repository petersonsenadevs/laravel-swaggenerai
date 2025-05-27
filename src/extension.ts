// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { LaravelParser } from './services/laravelParser';
import { GeminiService } from './services/geminiService';
import { getWorkspaceRoot, saveSwaggerDoc, getConfiguration } from './utils/fileUtils';

export function activate(context: vscode.ExtensionContext) {
    console.log('Laravel Swagger AI Generator is now active');

    let disposable = vscode.commands.registerCommand('laravel-swagger-ai-generator.generateDocs', async () => {
        try {
            const workspaceRoot = getWorkspaceRoot();
            if (!workspaceRoot) {
                throw new Error('No workspace folder found');
            }

            // Verificar la API key de Gemini
            const config = getConfiguration('laravelSwaggerAi');
            const apiKey = config.get<string>('geminiApiKey');
            if (!apiKey) {
                const key = await vscode.window.showInputBox({
                    prompt: 'Please enter your Gemini API key',
                    password: true
                });
                if (!key) {
                    throw new Error('Gemini API key is required');
                }
                await config.update('geminiApiKey', key, true);
            }

            // Mostrar progreso
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating Swagger Documentation",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Scanning Laravel files..." });
                
                // Parsear archivos Laravel
                const parser = new LaravelParser(workspaceRoot);
                const files = await parser.findAllLaravelFiles();
                
                progress.report({ message: "Analyzing relationships..." });
                const relatedFiles = await parser.findRelatedFiles(files);

                progress.report({ message: "Generating documentation..." });
                const gemini = new GeminiService(apiKey || '');

                for (const group of relatedFiles) {
                    const swaggerYaml = await gemini.generateSwaggerDoc(group);
                    await saveSwaggerDoc(swaggerYaml, workspaceRoot);
                }
            });

            vscode.window.showInformationMessage('Swagger documentation generated successfully!');
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unexpected error occurred');
            }
        }
    });

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
