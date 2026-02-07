import * as vscode from 'vscode';

export class FolderSelectionViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'laravelSwaggenerai.folderSelectionView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _context: vscode.ExtensionContext) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true
        };
        webviewView.webview.html = this.getWebviewContent();

        webviewView.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'getFolders':
                        const folders = await this.getWorkspaceFoldersTree();
                        webviewView.webview.postMessage({ command: 'foldersList', folders });
                        break;
                    case 'submit':
                        vscode.window.showInformationMessage(`Carpetas: ${JSON.stringify(message.folders)}`);
                        break;
                }
            },
            undefined,
            this._context.subscriptions
        );
    }

    private getWebviewContent(): string {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Seleccionar carpetas</title>
            <style>
                ul { list-style: none; padding-left: 1em; }
                .folder { margin-bottom: 0.2em; }
                .folder-label { font-weight: bold; }
                .folder-options { margin-left: 1.5em; }
            </style>
        </head>
        <body>
            <h2>Selecciona las carpetas y tipos a escanear</h2>
            <div id="folders"></div>
            <button onclick="submitSelection()">Escanear</button>
            <script>
                const vscode = acquireVsCodeApi();
                let folderTree = [];
                let selected = {};
                window.addEventListener('message', event => {
                    const msg = event.data;
                    console.log('[Webview] Mensaje recibido:', msg); // LOG
                    if (msg.command === 'foldersList') {
                        folderTree = msg.folders;
                        console.log('[Webview] Árbol de carpetas:', folderTree); // LOG
                        renderFolders();
                    }
                });
                vscode.postMessage({ command: 'getFolders' });
                function renderFolders() {
                    const container = document.getElementById('folders');
                    container.innerHTML = renderFolderList(folderTree);
                    console.log('[Webview] Carpetas renderizadas'); // LOG
                }
                function renderFolderList(folders) {
                    let html = '<ul>';
                    for (const f of folders) {
                        html += renderFolder(f);
                    }
                    html += '</ul>';
                    return html;
                }
                function renderFolder(folder) {
                    const id = btoa(folder.path);
                    let html = \`<li class='folder'>\`;
                    html += \`<span class='folder-label'>\${folder.name}</span>\`;
                    html += \`<span class='folder-options'>\`;
                    html += \`<label><input type='checkbox' onchange='onCheck("\${id}","controller",this.checked)'> Controller</label>\`;
                    html += \`<label><input type='checkbox' onchange='onCheck("\${id}","routes",this.checked)'> Rutas</label>\`;
                    html += \`<label><input type='checkbox' onchange='onCheck("\${id}","request",this.checked)'> Request</label>\`;
                    html += \`</span>\`;
                    if (folder.children && folder.children.length) {
                        html += renderFolderList(folder.children);
                    }
                    html += \`</li>\`;
                    return html;
                }
                window.onCheck = function(id, type, checked) {
                    if (!selected[id]) selected[id] = { controller: false, routes: false, request: false };
                    selected[id][type] = checked;
                    console.log('[Webview] Selección actual:', selected); // LOG
                }
                function submitSelection() {
                    const result = Object.entries(selected).filter(([_, v]) => v.controller || v.routes || v.request).map(([id, v]) => {
                        const path = atob(id);
                        return { path, ...v };
                    });
                    console.log('[Webview] Enviando selección:', result); // LOG
                    vscode.postMessage({ command: 'submit', folders: result });
                }
            </script>
        </body>
        </html>
        `;
    }

    async getWorkspaceFoldersTree() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) { return []; }
        async function readDirRecursive(uri: vscode.Uri): Promise<any[]> {
            const children = await vscode.workspace.fs.readDirectory(uri);
            return await Promise.all(children.filter(([name, type]) => type === vscode.FileType.Directory).map(async ([name]) => {
                const childUri = vscode.Uri.joinPath(uri, name);
                return {
                    name,
                    path: childUri.fsPath,
                    children: await readDirRecursive(childUri)
                };
            }));
        }
        return Promise.all(workspaceFolders.map(async folder => ({
            name: folder.name,
            path: folder.uri.fsPath,
            children: await readDirRecursive(folder.uri)
        })));
    }
}
