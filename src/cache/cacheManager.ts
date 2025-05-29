import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EndpointCache } from '../models/interfaces';

export function calculateFileHash(filePath: string): string {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
        console.warn(`Error calculating file hash for ${filePath}:`, error);
        return '';
    }
}

export async function loadCache(workspaceRoot: string): Promise<EndpointCache> {
    const cachePath = path.join(workspaceRoot, '.swagger-cache.json');
    let cache: EndpointCache = {
        timestamp: Date.now(),
        endpoints: {}
    };

    if (fs.existsSync(cachePath)) {
        try {
            const cacheContent = fs.readFileSync(cachePath, 'utf8');
            cache = JSON.parse(cacheContent);

            // Validar estructura del caché
            if (!cache.timestamp || !cache.endpoints) {
                throw new Error('Invalid cache structure');
            }
        } catch (error) {
            console.warn('Error loading cache:', error);
            cache = { timestamp: Date.now(), endpoints: {} };
        }
    }

    return cache;
}

export function saveCache(workspaceRoot: string, cache: EndpointCache): void {
    const cachePath = path.join(workspaceRoot, '.swagger-cache.json');
    try {
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    } catch (error) {
        console.warn('Error saving cache:', error);
        // Intentar backup
        const backupPath = path.join(workspaceRoot, '.swagger-cache.backup.json');
        try {
            fs.writeFileSync(backupPath, JSON.stringify(cache, null, 2));
        } catch (backupError) {
            console.error('Error saving backup cache:', backupError);
        }
    }
}
