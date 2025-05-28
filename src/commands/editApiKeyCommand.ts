import * as vscode from 'vscode';
import { getConfiguration } from '../utils/fileUtils';
import { AIModelType } from '../services/AIServiceFactory';

interface ModelInfo {
    label: string;
    value: AIModelType;
    description: string;
    configKey: string;
}

export async function editApiKey() {
    try {
        const models: ModelInfo[] = [
            {
                label: 'Google Gemini',
                value: 'gemini',
                description: 'Google Gemini Model',
                configKey: 'geminiApiKey'
            },
            {
                label: 'OpenAI GPT-4',
                value: 'openai',
                description: 'GPT-4',
                configKey: 'openaiApiKey'
            },
            {
                label: 'Anthropic Claude',
                value: 'anthropic',
                description: 'Claude Anthropic',
                configKey: 'anthropicApiKey'
            }
        ];

        // Seleccionar modelo
        const selectedModel = await vscode.window.showQuickPick(models, {
            placeHolder: 'Select the model to configure its API key',
            title: 'API Key Configuration'
        });

        if (!selectedModel) {
            return;
        }

        const config = getConfiguration('laravelSwaggerAi');
        const currentKey = config.get<string>(selectedModel.configKey) || '';

        // Solicitar nueva API key
        const newKey = await vscode.window.showInputBox({
            prompt: `Enter your API key to ${selectedModel.label}`,
            value: currentKey,
            password: true,
            validateInput: (value) => {
                if (!value) {
                    return 'The API key cannot be empty 😅';
                }
                if (value.length < 10) {
                    return 'The API key seems to be too short 😅';
                }
                return null;
            }
        });

        if (newKey) {
            await config.update(selectedModel.configKey, newKey, true);
            // Actualizar también el modelo seleccionado
            await config.update('selectedModel', selectedModel.value, true);
            vscode.window.showInformationMessage(
                `API key de ${selectedModel.label} successfully updated`
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error updating API key: ${error instanceof Error ? error.message : 'Uknown error'}`
        );
    }
}