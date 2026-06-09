Deno.serve(async (req) => {
    const files = [];
    async function listDir(path) {
        for await (const dirEntry of Deno.readDir(path)) {
            if (dirEntry.isDirectory) {
                files.push(path + '/' + dirEntry.name + '/');
            } else {
                files.push(path + '/' + dirEntry.name);
            }
        }
    }
    await listDir('.');
    return Response.json({ files });
});