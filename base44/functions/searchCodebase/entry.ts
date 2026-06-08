Deno.serve(async (req) => {
    try {
        const results = [];
        const searchStrings = [
            "invoke('createDefaultPermissions'",
            "invoke(\"createDefaultPermissions\"",
            "invoke('autoAssignProfile'",
            "invoke(\"autoAssignProfile\""
        ];
        
        async function searchDir(dirPath) {
            for await (const dirEntry of Deno.readDir(dirPath)) {
                const fullPath = `${dirPath}/${dirEntry.name}`;
                if (dirEntry.isDirectory) {
                    await searchDir(fullPath);
                } else if (dirEntry.isFile && (fullPath.endsWith('.js') || fullPath.endsWith('.jsx'))) {
                    const content = await Deno.readTextFile(fullPath);
                    for (const str of searchStrings) {
                        if (content.includes(str)) {
                            results.push({
                                file: fullPath,
                                string: str
                            });
                        }
                    }
                }
            }
        }
        
        await searchDir('./functions');
        await searchDir('./src'); // where pages usually are, but wait, files are in pages/, components/
        await searchDir('./pages');
        await searchDir('./components');
        
        return Response.json({ results });
    } catch (e) {
        return Response.json({ error: e.message });
    }
});