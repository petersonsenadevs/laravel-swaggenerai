import * as vscode from 'vscode';
// Referencia global para el controlador de cancelación
let currentAbortController: AbortController | null = null;
import * as path from 'path';
import { LaravelParser } from '../services/laravelParser';
import { getWorkspaceRoot, getConfiguration, saveSwaggerDoc } from '../utils/fileUtils';
import { loadCache, saveCache, calculateFileHash } from '../cache/cacheManager';
import { AIServiceFactory } from '../services/AIServiceFactory';

export async function generateDocs() {
    // Si hay una tarea previa, cancelarla
    if (currentAbortController) {
        currentAbortController.abort();
    }
    // Crear un nuevo controlador para esta ejecución
    const abortController = new AbortController();
    currentAbortController = abortController;
    const { signal } = abortController;
    try {
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }


        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating documentation",
            cancellable: true
        }, async (progress, token) => {
            // Si el usuario cancela desde la UI, también abortamos
            token.onCancellationRequested(() => {
                abortController.abort();
            });
            if (signal.aborted) { return; }
            progress.report({ message: "Initializing AI service 🤖..." });
            // Obtener el servicio de IA configurado
            const aiService = await AIServiceFactory.createService();

            if (signal.aborted) { return; }
            progress.report({ message: "Scanning Laravel files ... 📂" });
            const parser = new LaravelParser(workspaceRoot);
            const files = await parser.findAllLaravelFiles();

            if (signal.aborted) { return; }
            progress.report({ message: "Finding related files 🩺..." });
            const relatedFiles = await parser.findRelatedFiles(files);

            if (signal.aborted) { return; }
            progress.report({ message: "Generating documentation 💾..." });

            // Cargar caché
            let cache = await loadCache(workspaceRoot);

            for (const group of relatedFiles) {
                if (signal.aborted) { return; }
                if (!group.controller) { continue; }

                const controllerName = path.basename(group.controller.path, '.php')
                    .replace('Controller', '');

                progress.report({ message: `Processing ${controllerName}...` });

                try {
                    const docs = await aiService.generateSwaggerDoc(group);

                    if (signal.aborted) { return; }
                    if (docs.baseConfig) {
                        await saveSwaggerDoc(
                            docs.baseConfig,
                            workspaceRoot,
                            { isBaseConfig: true }
                        );
                    }

                    for (const endpoint of docs.endpoints) {
                        if (signal.aborted) { return; }
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
                    if (!signal.aborted) {
                        vscode.window.showWarningMessage(
                            `Error generating documentation for ${controllerName}: ${error instanceof Error ? error.message : String(error)}`
                        );
                    }
                }
            }

            if (signal.aborted) { return; }
            // Guardar caché actualizado
            saveCache(workspaceRoot, cache);
        });

        if (!signal.aborted) {
            vscode.window.showInformationMessage(
                'Documentation generated successfully 😊!'
            );
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            vscode.window.showWarningMessage('Generación de documentación cancelada.');
        } else if (error instanceof Error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    } finally {
        // Limpiar referencia si es la ejecución actual
        if (currentAbortController === abortController) {
            currentAbortController = null;
        }
    }
}