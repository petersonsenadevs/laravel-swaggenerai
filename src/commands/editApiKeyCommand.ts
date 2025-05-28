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
                description: 'Modelo Gemini de Google',
                configKey: 'geminiApiKey'
            },
            {
                label: 'OpenAI GPT-4',
                value: 'openai',
                description: 'GPT-4 de OpenAI',
                configKey: 'openaiApiKey'
            },
            {
                label: 'Anthropic Claude',
                value: 'anthropic',
                description: 'Claude de Anthropic',
                configKey: 'anthropicApiKey'
            }
        ];

        // Seleccionar modelo
        const selectedModel = await vscode.window.showQuickPick(models, {
            placeHolder: 'Selecciona el modelo para configurar su API key',
            title: 'Configurar API Key'
        });

        if (!selectedModel) {
            return;
        }

        const config = getConfiguration('laravelSwaggerAi');
        const currentKey = config.get<string>(selectedModel.configKey) || '';

        // Solicitar nueva API key
        const newKey = await vscode.window.showInputBox({
            prompt: `Ingresa tu API key para ${selectedModel.label}`,
            value: currentKey,
            password: true,
            validateInput: (value) => {
                if (!value) {
                    return 'La API key no puede estar vacía';
                }
                if (value.length < 10) {
                    return 'La API key parece ser demasiado corta';
                }
                return null;
            }
        });

        if (newKey) {
            await config.update(selectedModel.configKey, newKey, true);
            // Actualizar también el modelo seleccionado
            await config.update('selectedModel', selectedModel.value, true);
            vscode.window.showInformationMessage(
                `API key de ${selectedModel.label} actualizada exitosamente`
            );
        }
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error al actualizar la API key: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
    }
}