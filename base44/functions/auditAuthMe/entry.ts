import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const results = [];
        
        async function searchDir(dirPath) {
            for await (const dirEntry of Deno.readDir(dirPath)) {
                const fullPath = `${dirPath}/${dirEntry.name}`;
                if (dirEntry.isDirectory) {
                    await searchDir(fullPath);
                } else if (dirEntry.isFile && (fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
                    const content = await Deno.readTextFile(fullPath);
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes('base44.auth.me()')) {
                            results.push({
                                function: dirEntry.name,
                                line: i + 1,
                                usage: lines[i].trim()
                            });
                        }
                    }
                }
            }
        }
        
        await searchDir('./functions');
        
        return Response.json(results);
    } catch (e) {
        return Response.json({ error: e.message });
    }
});