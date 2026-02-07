import { BaseAIService } from "./ai/BaseAIService";
import * as vscode from 'vscode';
import { RelatedFiles, GeneratedDocs } from "../types";

export interface OllamaModel {
    name: string;
    size: string;
    modified: string;
}

export class OllamaService extends BaseAIService {
    private baseUrl: string;
    private currentModel: string = 'llama2';

    constructor(baseUrl: string = 'http://localhost:11434') {
        super(''); // Ollama no necesita API key
        this.baseUrl = baseUrl;
    }

    setModel(modelName: string) {
        this.currentModel = modelName;
    }

    async validateApiKey(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch (error) {
            throw new Error('Cannot connect to Ollama server');
        }
    }

    public async generateContent(prompt: string): Promise<string> {
        vscode.window.showInformationMessage('Using Ollama locally to generate content...');

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating with Ollama',
            cancellable: false
        }, async (progress) => {
            progress.report({ message: `Using model: ${this.currentModel} 🤖` });

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.currentModel,
                    prompt: prompt
                })
            });

            if (!response.ok) {
                throw new Error(`Error generating content: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            let result = '';

            while (true) {
                const { done, value } = await reader!.read();
                if (done){ break;}
                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line);
                for (const line of lines) {
                    const data = JSON.parse(line);
                    if (data.response) {
                        result += data.response;
                    }
                }
            }

            return result;
        });
    }

    async getAvailableModels(): Promise<OllamaModel[]> {
        const response = await fetch(`${this.baseUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Error fetching models: ${response.statusText}`);
        }
        const data = await response.json();
        return data.models;
    }

    async downloadModel(modelName: string, progressCallback: (status: string) => void): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: modelName })
        });

        if (!response.ok) {
            throw new Error(`Error downloading model: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Cannot read response');
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) {break;}

            const text = new TextDecoder().decode(value);
            const lines = text.split('\n').filter(line => line);
            
            for (const line of lines) {
                const data = JSON.parse(line);
                if (data.status) {
                    progressCallback(data.status);
                }
            }
        }
    }
}