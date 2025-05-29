import * as vscode from 'vscode';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openAIService';
import { AnthropicService } from './anthropicService';
import { getConfiguration } from '../utils/fileUtils';
import { IAIService } from './ai/IAIService';

export type AIModelType = 'gemini' | 'openai' | 'anthropic';

export class AIServiceFactory {
    static async createService(): Promise<IAIService> {
        const config = getConfiguration('laravelSwaggerAi');
        const selectedModel = config.get<AIModelType>('selectedModel') || 'gemini';
        const apiKeyConfig = `${selectedModel}ApiKey`;
        const apiKey = config.get<string>(apiKeyConfig);

        if (!apiKey) {
            throw new Error(`API key not found for ${selectedModel} 😭`);
        }

        try {
            let service: IAIService;
            
            switch (selectedModel) {
                case 'gemini':
                    service = new GeminiService(apiKey);
                    break;
                case 'openai':
                    service = new OpenAIService(apiKey);
                    break;
                case 'anthropic':
                    service = new AnthropicService(apiKey);
                    break;
                default:
                    throw new Error('Model not found');
            }

            await service.validateApiKey();
            return service;

        } catch (error) {
            throw new Error(`Error con ${selectedModel}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
