import { OllamaService } from './ollamaServices';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openAIService';
import { AnthropicService } from './anthropicService';
import { getConfiguration } from '../utils/fileUtils';
import { IAIService } from './ai/IAIService';

export type AIModelType = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export class AIServiceFactory {
    static async createService(): Promise<IAIService> {
        const config = getConfiguration('laravelSwaggerAi');
        const selectedModel = config.get<AIModelType>('selectedModel') || 'gemini';

        try {
            let service: IAIService;
            
            switch (selectedModel) {
                case 'gemini':
                    const geminiKey = config.get<string>('geminiApiKey');
                    if (!geminiKey) {throw new Error('API key not found for Gemini 😭');}
                    service = new GeminiService(geminiKey);
                    break;
                case 'openai':
                    const openaiKey = config.get<string>('openaiApiKey');
                    if (!openaiKey){ throw new Error('API key not found for OpenAI 😭');}
                    service = new OpenAIService(openaiKey);
                    break;
                case 'anthropic':
                    const anthropicKey = config.get<string>('anthropicApiKey');
                    if (!anthropicKey){ throw new Error('API key not found for Anthropic 😭');}
                    service = new AnthropicService(anthropicKey);
                    break;
                case 'ollama':
                    service = new OllamaService();
                    const ollamaModel = config.get<string>('ollamaModel') || 'llama2';
                    (service as OllamaService).setModel(ollamaModel);
                    break;
                default:
                    throw new Error('Model not supported');
            }

            // Solo validamos API key si no es Ollama
            if (selectedModel !== 'ollama') {
                await service.validateApiKey();
            }

            return service;
        } catch (error) {
            throw new Error(`Error with ${selectedModel}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}