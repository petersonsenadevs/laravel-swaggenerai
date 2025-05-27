import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function saveSwaggerDoc(content: string, workspacePath: string): Promise<void> {
    try {
        const swaggerDir = path.join(workspacePath, 'swagger');
        
        // Crear directorio swagger si no existe
        await fs.mkdir(swaggerDir, { recursive: true });
        
        // Guardar archivo YAML
        const yamlPath = path.join(swaggerDir, 'swagger.yaml');
        await fs.writeFile(yamlPath, content, 'utf-8');
        
        // Crear archivo HTML para visualización
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@latest/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@latest/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "./swagger.yaml",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ]
            });
        }
    </script>
</body>
</html>`;
        
        await fs.writeFile(path.join(swaggerDir, 'index.html'), htmlContent, 'utf-8');

        // Abrir la documentación en el navegador integrado
        const htmlUri = vscode.Uri.file(path.join(swaggerDir, 'index.html'));
        vscode.commands.executeCommand('vscode.open', htmlUri);
    } catch (error) {
        console.error('Error saving Swagger documentation:', error);
        throw error;
    }
}

export function getWorkspaceRoot(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        throw new Error('No workspace folder found');
    }
    return workspaceFolders[0].uri.fsPath;
}

export function getConfiguration(section: string): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section);
}
