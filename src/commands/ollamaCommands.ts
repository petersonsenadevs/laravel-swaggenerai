import * as vscode from 'vscode';
import { getConfiguration } from '../utils/fileUtils';
import { OllamaService } from '../services/ollamaServices'; 

export async function ollamaCommands() {
    try {
        const options = [
            {
                label: 'List Models',
                description: 'Show available Ollama models',
                value: 'list'
            },
            {
                label: 'Download Model',
                description: 'Download a specific model',
                value: 'download'
            }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select Ollama Action 🤖',
            title: 'Ollama Commands'
        });

        if (!selected) {
            return;
        }

        const ollama = new OllamaService();

        switch (selected.value) {
            case 'list':
                await listModels(ollama);
                break;
            case 'download':
                await downloadModel(ollama);
                break;
        }

    } catch (error) {
        vscode.window.showErrorMessage(
            `Error with Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

async function listModels(ollama: OllamaService) {
    try {
        const models = await ollama.getAvailableModels();
        if (models.length === 0) {
            vscode.window.showInformationMessage('No models found in Ollama');
            return;
        }

        const modelList = models.map(model => ({
            label: model.name,
            description: `Size: ${model.size}`,
            detail: `Last modified: ${new Date(model.modified).toLocaleString()}`
        }));

        const selected = await vscode.window.showQuickPick(modelList, {
            placeHolder: 'Select a model to use',
            title: 'Ollama Models'
        });

        if (selected) {
            const config = getConfiguration('laravelSwaggerAi');
            await config.update('selectedModel', 'ollama', true);
            await config.update('ollamaModel', selected.label, true);
            
            ollama.setModel(selected.label);
            
            vscode.window.showInformationMessage(
                `Switched to Ollama using model: ${selected.label} 🤖`
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage('Error listing models: ' + error);
    }
}

async function downloadModel(ollama: OllamaService) {
    try {
        const modelName = await vscode.window.showInputBox({
            placeHolder: 'Enter model name (e.g., llama2, codellama)',
            title: 'Download Ollama Model',
            validateInput: (value) => {
                if (!value) {
                    return 'Model name cannot be empty';
                }
                return null;
            }
        });

        if (!modelName) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Downloading ${modelName}`,
            cancellable: false
        }, async (progress) => {
            await ollama.downloadModel(modelName, (status) => {
                progress.report({ message: status });
            });
        });

        vscode.window.showInformationMessage(`Model ${modelName} downloaded successfully! 🎉`);

    } catch (error) {
        vscode.window.showErrorMessage('Error downloading model: ' + error);
    }
}