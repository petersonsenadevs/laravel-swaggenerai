import * as vscode from 'vscode';
import { getConfiguration } from '../utils/fileUtils';
import { AIModelType } from '../services/AIServiceFactory';

interface ProviderQuickPickItem extends vscode.QuickPickItem {
    value: AIModelType;
}

export async function selectAIProvider() {
    try {
        const config = getConfiguration('laravelSwaggerAi');
        
        // Obtener el proveedor actual
        const currentProvider = config.get<AIModelType>('selectedModel') || 'gemini';
        
        // Lista de proveedores disponibles
        const providers: ProviderQuickPickItem[] = [
            {
                label: 'Google Gemini',
                value: 'gemini',
                description: 'Google Gemini Model',
                detail: 'Recommended for best performance'
            },
            {
                label: 'OpenAI GPT-4',
                value: 'openai',
                description: 'GPT-4 de OpenAI',
                detail: 'Greater context capacity'
            },
            {
                label: 'Anthropic Claude',
                value: 'anthropic',
                description: 'Claude de Anthropic',
                detail: 'Better context capacity'
            }
        ];

        // Seleccionar proveedor
        const selected = await vscode.window.showQuickPick(providers, {
            placeHolder: 'Select the AI ​​​​provider 🧠',
            title: 'Change AI Provider'
        });

        if (!selected) {
            return;
        }

        // Actualizar el proveedor seleccionado
        await config.update('selectedModel', selected.value, true);

        // Verificar si tiene API key configurada
        const apiKeyConfig = `${selected.value}ApiKey`;
        const hasApiKey = config.get<string>(apiKeyConfig);

        if (!hasApiKey) {
            const apiKey = await vscode.window.showInputBox({
                prompt: `Enter your API key ${selected.label}`,
                password: true,
                validateInput: (value) => {
                    if (!value) {
                        return `The API key cannot be empty. ${selected.label}`;
                    }
                    if (value.length < 10) {
                        return 'The API key seems to be too short 😅';
                    }
                    return null;
                }
            });

            if (apiKey) {
                await config.update(apiKeyConfig, apiKey, true);
                vscode.window.showInformationMessage(`API key  ${selected.label} successfully updated 🎉`);
            }
        }

        vscode.window.showInformationMessage(`AI provider changed to ${selected.label} successfully 🎉`);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error trying to change AI provider: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}