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
 * Limpia el contenido PHP eliminando duplicados
 */
function cleanPhpContent(content: string): string {
    // Eliminar secciones duplicadas
    const sections = content.split('<?php').filter(Boolean);
    if (sections.length > 1) {
        content = sections[sections.length - 1].trim();
    }

    // Limpiar prefijo api de las rutas
    content = content
        .replace(/path="\/api\//g, 'path="/')
        .replace(/path="api\//g, 'path="/');

    // Asegurar que no haya declaraciones duplicadas
    const lines = content.split('\n');
    const uniqueLines = new Set<string>();
    const cleanedLines = lines.filter(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('namespace') || trimmedLine.startsWith('use OpenApi')) {
            if (uniqueLines.has(trimmedLine)) return false;
            uniqueLines.add(trimmedLine);
        }
        return true;
    });

    return cleanedLines.join('\n');
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
    let className: string;

    if (options.isBaseConfig) {
        // Para AnnotationsInfo.php
        targetDir = annotationsBase;
        fileName = 'AnnotationsInfo.php';
        namespace = 'App\\Annotations\\Swagger';
        className = 'AnnotationsInfo';
    } else {
        // Para anotaciones de endpoints específicos
        if (!options.module || !options.action) {
            throw new Error('Module and action are required for endpoint annotations');
        }

        // Si es __invoke, usar una estructura más simple
        if (options.action === '__invoke') {
            targetDir = path.join(annotationsBase, options.module);
            className = `${options.module}Annotations`;
            fileName = `${className}.php`;
            namespace = `App\\Annotations\\Swagger\\${options.module}`;
        } else {
            targetDir = path.join(annotationsBase, options.module);
            className = `${options.action}Annotations`;
            fileName = `${className}.php`;
            namespace = `App\\Annotations\\Swagger\\${options.module}`;
        }
    }

    // Crear directorios necesarios
    fs.mkdirSync(targetDir, { recursive: true });

    // Limpiar el contenido antes de procesarlo
    const cleanedContent = cleanPhpContent(content);

    // Envolver el contenido en una clase PHP
    const classContent = generatePhpClass(cleanedContent, namespace, className);

    // Guardar el archivo
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, classContent, 'utf8');

    // Mostrar y abrir el archivo generado
    const fileUri = vscode.Uri.file(filePath);
    vscode.window.showTextDocument(fileUri);

    return filePath;
}

function generatePhpClass(annotations: string, namespace: string, className: string): string {
    // Eliminar cualquier declaración PHP, namespace o use existente
    let cleanAnnotations = annotations
        .replace(/^<\?php\s*/m, '')
        .replace(/^namespace\s+[^;]+;\s*/m, '')
        .replace(/^use\s+[^;]+;\s*/m, '')
        .trim();

    // Eliminar llaves sueltas antes de la clase
    cleanAnnotations = cleanAnnotations.replace(/\n\s*}\s*\n(?=class\s+)/g, '\n');

    // Eliminar clases duplicadas (incluyendo llaves sueltas)
    const classRegex = className === 'AnnotationsInfo' 
        ? new RegExp(`(}\n)?class\\s+${className}\\s*{[^}]*}`, 'g')
        : new RegExp(`(}\n)?class\\s+\\w+Annotations\\s*{[^}]*}`, 'g');
    
    const classMatches = cleanAnnotations.match(classRegex);
    
    if (classMatches && classMatches.length > 0) {
        // Eliminar todas las declaraciones de clase y llaves sueltas
        cleanAnnotations = cleanAnnotations.replace(classRegex, '');
    }

    // Eliminar cualquier llave suelta restante
    cleanAnnotations = cleanAnnotations
        .replace(/\n\s*}\s*$/, '')  // al final del archivo
        .replace(/^\s*}\s*\n/, '')  // al inicio del archivo
        .replace(/\n\s*}\s*\n/, '\n\n')  // en medio del contenido
        .replace(/public function register\(\) \{\}\s*public function register\(\) \{\}/g, 'public function register() {}'); // eliminar register duplicados

    // Limpiar espacios extra y líneas en blanco
    cleanAnnotations = cleanAnnotations
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Generar el archivo PHP con una única declaración de clase
    return `<?php

namespace ${namespace};

use OpenApi\\Annotations as OA;

class ${className}
{
${cleanAnnotations}

    public function register() {}
}`;
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