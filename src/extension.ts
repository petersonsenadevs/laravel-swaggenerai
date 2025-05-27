import * as vscode from 'vscode';
import { LaravelParser } from './services/laravelParser';
import { GeminiService } from './services/geminiService';
import { getWorkspaceRoot, saveSwaggerDoc, getConfiguration } from './utils/fileUtils';
import * as path from 'path';

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
                    prompt: 'Ingresa tu API key de Gemini',
                    password: true
                });
                if (!key) {
                    throw new Error('Se requiere la API key de Gemini');
                }
                await config.update('geminiApiKey', key, true);
            }

            // Mostrar progreso
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generando documentación Swagger",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Escaneando archivos Laravel..." });
                
                // Parsear archivos Laravel
                const parser = new LaravelParser(workspaceRoot);
                const files = await parser.findAllLaravelFiles();
                
                progress.report({ message: "Analizando relaciones..." });
                const relatedFiles = await parser.findRelatedFiles(files);

                progress.report({ message: "Generando documentación..." });
                const gemini = new GeminiService(apiKey || '');

                // Procesar cada grupo de archivos relacionados
                for (const group of relatedFiles) {
                    if (!group.controller) continue;

                    const controllerName = path.basename(group.controller.path, '.php')
                        .replace('Controller', '');
                    
                    progress.report({ message: `Procesando ${controllerName}...` });
                    
                    try {
                        const docs = await gemini.generateSwaggerDoc(group);

                        // Guardar configuración base (solo una vez)
                        if (docs.baseConfig) {
                            await saveSwaggerDoc(
                                docs.baseConfig,
                                workspaceRoot,
                                { isBaseConfig: true }
                            );
                        }

                        // Guardar documentación de cada endpoint
                        for (const endpoint of docs.endpoints) {
                            progress.report({ 
                                message: `Generando documentación para ${endpoint.action}...` 
                            });

                            await saveSwaggerDoc(
                                endpoint.content,
                                workspaceRoot,
                                {
                                    module: endpoint.module,
                                    action: endpoint.action
                                }
                            );
                        }
                    } catch (error) {
                        vscode.window.showWarningMessage(
                            `Error procesando ${controllerName}: ${error}`
                        );
                    }
                }
            });

            vscode.window.showInformationMessage(
                'Documentación Swagger generada exitosamente!'
            );
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('Ocurrió un error inesperado');
            }
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}