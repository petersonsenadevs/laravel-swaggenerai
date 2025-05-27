import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface SwaggerFileOptions {
    module?: string;
    action?: string;
    isBaseConfig?: boolean;
    className?: string;
}

/**
 * Guarda un archivo de documentación Swagger en formato PHP
 */
export function saveSwaggerDoc(
    content: string, 
    basePath: string, 
    options: SwaggerFileOptions = {}
): string {
    // Construir la ruta del directorio base de anotaciones
    const annotationsBase = path.join(basePath, 'app', 'Annotations', 'Swagger');

    let targetDir: string;
    let fileName: string;
    let namespace: string;

    if (options.isBaseConfig) {
        // Para AnnotationsInfo.php
        targetDir = annotationsBase;
        fileName = 'AnnotationsInfo.php';
        namespace = 'App\\Annotations\\Swagger';
    } else {
        // Para anotaciones de endpoints específicos
        if (!options.module || !options.action) {
            throw new Error('Module and action are required for endpoint annotations');
        }
        targetDir = path.join(annotationsBase, options.module, options.action);
        fileName = `${options.className || `${options.action}Annotations`}.php`;
        namespace = `App\\Annotations\\Swagger\\${options.module}\\${options.action}`;
    }

    // Crear directorios necesarios
    fs.mkdirSync(targetDir, { recursive: true });

    // Envolver el contenido en una clase PHP
    const classContent = generatePhpClass(content, namespace, fileName.replace('.php', ''));

    // Guardar el archivo
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, classContent, 'utf8');

    // Mostrar y abrir el archivo generado
    const fileUri = vscode.Uri.file(filePath);
    vscode.window.showTextDocument(fileUri);

    return filePath;
}

/**
 * Genera el contenido de la clase PHP con el namespace y anotaciones correctas
 */
function generatePhpClass(annotations: string, namespace: string, className: string): string {
    return `<?php

namespace ${namespace};

use OpenApi\\Annotations as OA;

${annotations}
class ${className}
{
    public function register() {}
}
`;
}

/**
 * Obtiene la raíz del workspace abierto
 */
export function getWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
}

/**
 * Devuelve la configuración de la extensión
 */
export function getConfiguration(section: string): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section);
}