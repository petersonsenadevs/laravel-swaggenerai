import * as vscode from 'vscode';

export function showFolderSelectionPanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'folderSelection',
        'Seleccionar carpetas a escanear',
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
    );

    panel.webview.html = getWebviewContent();

    // Aquí puedes manejar los mensajes del Webview
    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'submit':
                    // Aquí se recibirán las carpetas y opciones seleccionadas
                    vscode.window.showInformationMessage(`Carpetas: ${message.folders}, Opciones: ${JSON.stringify(message.options)}`);
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
}

function getWebviewContent(): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Seleccionar carpetas</title>
    </head>
    <body>
        <h2>Selecciona las carpetas a escanear</h2>
        <div id="folders"></div>
        <div>
            <label><input type="checkbox" id="controller"> Controller</label><br>
            <label><input type="checkbox" id="routes"> Rutas</label><br>
            <label><input type="checkbox" id="request"> Request</label><br>
        </div>
        <button onclick="submitSelection()">Escanear</button>
        <script>
            const vscode = acquireVsCodeApi();
            // Aquí podrías cargar las carpetas del workspace si lo deseas
            function submitSelection() {
                const options = {
                    controller: document.getElementById('controller').checked,
                    routes: document.getElementById('routes').checked,
                    request: document.getElementById('request').checked
                };
                // Por ahora, solo ejemplo, puedes mejorar la selección de carpetas
                vscode.postMessage({
                    command: 'submit',
                    folders: [],
                    options
                });
            }
        </script>
    </body>
    </html>
    `;
}
