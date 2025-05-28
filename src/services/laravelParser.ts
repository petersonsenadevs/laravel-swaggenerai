import * as vscode from "vscode";
import { readFile } from "fs/promises";
import { LaravelFile, RelatedFiles } from "../types";
import path = require("path");
import glob = require("glob");
import * as fs from 'fs';

export class LaravelParser {
    constructor(private workspaceRoot: string) {}

    private async globAsync(pattern: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            glob(pattern, { cwd: this.workspaceRoot }, (err: Error | null, matches: string[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(matches);
                }
            });
        });
    }

    private async processFiles(pattern: string, type: LaravelFile["type"]): Promise<LaravelFile[]> {
        const files: LaravelFile[] = [];
        const matches = await this.globAsync(pattern);
        
        for (const file of matches) {
            const content = await readFile(path.join(this.workspaceRoot, file), "utf-8");
            files.push({
                path: file,
                content,
                type
            });
        }
        
        return files;
    }

    async findAllLaravelFiles(): Promise<LaravelFile[]> {
        try {
            const [controllers, routes, requests] = await Promise.all([
                this.processFiles("**/app/Http/Controllers/**/*Controller.php", "controller"),
                this.processFiles("**/routes/**/*.php", "route"),
                this.processFiles("**/app/Http/Requests/**/*.php", "request")
            ]);

            return [...controllers, ...routes, ...requests];
        } catch (error) {
            console.error("Error finding Laravel files:", error);
            throw error;
        }
    }

    async findRelatedFiles(files: LaravelFile[]): Promise<RelatedFiles[]> {
        const relatedGroups: RelatedFiles[] = [];

        for (const file of files) {
            if (file.type === "controller") {
                const controllerName = path.basename(file.path, ".php");
                const group: RelatedFiles = {
                    controller: file,
                    routes: [],
                    requests: []
                };

                const relatedRoutes = files.filter(f => 
                    f.type === "route" && f.content.includes(controllerName)
                );
                if (relatedRoutes.length > 0) {
                    group.routes = relatedRoutes;
                }

                const relatedRequests = files.filter(f =>
                    f.type === "request" && f.content.includes(controllerName)
                );
                if (relatedRequests.length > 0) {
                    group.requests = relatedRequests;
                }

                if (relatedRoutes.length > 0 || relatedRequests.length > 0) {
                    relatedGroups.push(group);
                }
            }
        }

        return relatedGroups;
    }

    async findMissingAnnotations(files: LaravelFile[]): Promise<Map<string, string[]>> {
        const missingAnnotations = new Map<string, string[]>();
        const swaggerPath = path.join(this.workspaceRoot, 'app', 'Annotations', 'Swagger');

        for (const file of files) {
            if (file.type === "controller") {
                const controllerName = path.basename(file.path, ".php").replace('Controller', '');
                const controllerPath = path.join(swaggerPath, controllerName);
                const missingMethods: string[] = [];

                const methodRegex = /public function (\w+)\s*\([^)]*\)/g;
                let match;
                
                while ((match = methodRegex.exec(file.content)) !== null) {
                    const methodName = match[1];
                    
                    if (methodName === '__construct' || methodName.startsWith('__')) {
                        continue;
                    }

                    const annotationFile = path.join(
                        controllerPath, 
                        `${methodName}Annotations.php`
                    );
                    
                    if (!fs.existsSync(annotationFile)) {
                        missingMethods.push(methodName);
                    }
                }

                if (missingMethods.length > 0) {
                    missingAnnotations.set(controllerName, missingMethods);
                }
            }
        }

        return missingAnnotations;
    }
}