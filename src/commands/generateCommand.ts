import * as vscode from 'vscode';
import * as path from 'path';
import { LaravelParser } from '../services/laravelParser';
import { getWorkspaceRoot, getConfiguration, saveSwaggerDoc } from '../utils/fileUtils';
import { loadCache, saveCache, calculateFileHash } from '../cache/cacheManager';
import { AIServiceFactory } from '../services/AIServiceFactory';

export async function generateDocs() {
    try {
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating documentation",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Initializing AI service 🤖..." });
            
            // Obtener el servicio de IA configurado
            const aiService = await AIServiceFactory.createService();
            
            progress.report({ message: "Scanning Laravel files ... 📂" });
            const parser = new LaravelParser(workspaceRoot);
            const files = await parser.findAllLaravelFiles();
            
            progress.report({ message: "Finding related files 🩺..." });
            const relatedFiles = await parser.findRelatedFiles(files);

            progress.report({ message: "Generating documentation 💾..." });

            // Cargar caché
            let cache = await loadCache(workspaceRoot);

            for (const group of relatedFiles) {
                if (!group.controller) {continue;}

                const controllerName = path.basename(group.controller.path, '.php')
                    .replace('Controller', '');
                
                progress.report({ message: `Procesando ${controllerName}...` });
                
                try {
                    const docs = await aiService.generateSwaggerDoc(group);

                    if (docs.baseConfig) {
                        await saveSwaggerDoc(
                            docs.baseConfig,
                            workspaceRoot,
                            { isBaseConfig: true }
                        );
                    }

                    for (const endpoint of docs.endpoints) {
                        const annotationPath = path.join(
                            workspaceRoot,
                            'app',
                            'Annotations',
                            'Swagger',
                            controllerName,
                            `${endpoint.action}Annotations.php`
                        );

                        await saveSwaggerDoc(
                            endpoint.content,
                            workspaceRoot,
                            {
                                module: endpoint.module,
                                action: endpoint.action
                            }
                        );

                        // Actualizar caché con hash
                        if (!cache.endpoints[controllerName]) {
                            cache.endpoints[controllerName] = {};
                        }
                        
                        cache.endpoints[controllerName][endpoint.action] = {
                            hasAnnotation: true,
                            lastUpdated: Date.now(),
                            filePath: annotationPath,
                            fileHash: calculateFileHash(annotationPath)
                        };
                    }
                } catch (error) {
                    vscode.window.showWarningMessage(
                        `Error generating documentation for ${controllerName}: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }

            // Guardar caché actualizado
            saveCache(workspaceRoot, cache);
        });

        vscode.window.showInformationMessage(
            'Documentation generated successfully 😊!'
        );
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    }
}