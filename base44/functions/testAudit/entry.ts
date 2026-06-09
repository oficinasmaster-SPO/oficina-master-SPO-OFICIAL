import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function searchFiles(dir, regexes) {
  let results = [];
  try {
    for await (const dirEntry of Deno.readDir(dir)) {
      const entryPath = `${dir}/${dirEntry.name}`;
      if (dirEntry.isDirectory) {
        if (!['node_modules', '.git', '.b44', 'dist', 'build', '.vite'].includes(dirEntry.name)) {
          results = results.concat(await searchFiles(entryPath, regexes));
        }
      } else if (dirEntry.isFile && (entryPath.endsWith('.js') || entryPath.endsWith('.jsx'))) {
        const text = await Deno.readTextFile(entryPath);
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          for (const rx of regexes) {
            if (rx.test(lines[i])) {
              results.push({ file: entryPath, line: i + 1, match: lines[i].trim() });
            }
          }
        }
      }
    }
  } catch (err) {}
  return results;
}

Deno.serve(async (req) => {
  try {
    // Determine the root directory. In Base44, the frontend code might be mapped differently or just mounted somewhere.
    // Deno backend functions run in a specific isolate. Are the frontend files accessible?
    // Let's try searching '/app', '.', '..'
    let rootDir = '.';
    for await (const entry of Deno.readDir('..')) {
       if (entry.name === 'pages' || entry.name === 'components' || entry.name === 'src') {
          rootDir = '..';
       }
    }
    for await (const entry of Deno.readDir('/app')) {
       if (entry.name === 'pages' || entry.name === 'components' || entry.name === 'src') {
          rootDir = '/app';
       }
    }

    const results1 = await searchFiles(rootDir, [
      /getImpersonationData\(/,
      /startImpersonation\(/,
      /stopImpersonation\(/
    ]);
    
    const results2 = await searchFiles(rootDir, [
      /['"]om_impersonation['"]/,
      /['"]selected_company_id['"]/,
      /['"]selected_firm_id['"]/
    ]);
    
    return Response.json({ rootDir, step1: results1, step2: results2 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});