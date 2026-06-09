Deno.serve(async (req) => {
    try {
        const payload = await req.json().catch(() => ({}));
        const searchString = payload.query || "selected_company_id";
        
        const results = [];
        
        async function searchDir(dirPath) {
            try {
                for await (const dirEntry of Deno.readDir(dirPath)) {
                    const fullPath = `${dirPath}/${dirEntry.name}`;
                    if (dirEntry.isDirectory) {
                        if (dirEntry.name === '.git' || dirEntry.name === 'node_modules') continue;
                        await searchDir(fullPath);
                    } else if (dirEntry.isFile && (fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
                        const content = await Deno.readTextFile(fullPath);
                        if (content.includes(searchString)) {
                            const lines = content.split('\n');
                            lines.forEach((line, index) => {
                                if (line.includes(searchString)) {
                                    results.push({
                                        file: fullPath,
                                        line: index + 1,
                                        content: line.trim()
                                    });
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                // Ignore errors reading directories
            }
        }
        
        await searchDir('.');
        
        return Response.json({ results });
    } catch (e) {
        return Response.json({ error: e.message });
    }
});