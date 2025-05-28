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
                description: 'Modelo Gemini de Google',
                detail: 'Recomendado para mejor rendimiento'
            },
            {
                label: 'OpenAI GPT-4',
                value: 'openai',
                description: 'GPT-4 de OpenAI',
                detail: 'Mayor capacidad de contexto'
            },
            {
                label: 'Anthropic Claude',
                value: 'anthropic',
                description: 'Claude de Anthropic',
                detail: 'Excelente comprensión de código'
            }
        ];

        // Seleccionar proveedor
        const selected = await vscode.window.showQuickPick(providers, {
            placeHolder: 'Selecciona el proveedor de IA',
            title: 'Cambiar Proveedor de IA'
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
                prompt: `Ingresa tu API key para ${selected.label}`,
                password: true,
                validateInput: (value) => {
                    if (!value) {
                        return `La API key no puede estar vacía de ${selected.label}`;
                    }
                    if (value.length < 10) {
                        return 'La API key parece ser demasiado corta';
                    }
                    return null;
                }
            });

            if (apiKey) {
                await config.update(apiKeyConfig, apiKey, true);
                vscode.window.showInformationMessage(`API key de ${selected.label} configurada exitosamente 🎉`);
            }
        }

        vscode.window.showInformationMessage(`Proveedor de IA cambiado a ${selected.label} exitosamente 🎉`);
    } catch (error) {
        vscode.window.showErrorMessage(
            `Error al cambiar el proveedor de IA: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
    }
}