const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { Collection } = require('postman-collection');
const archiver = require('archiver');
const { generateToolFile } = require('./lib/tools');
const { OpenAI } = require('openai');

async function generateMcpServer(options) {
    const { collectionPath, outputZipPath, openAIApiKey, serverMode } = options;
    const collectionJson = JSON.parse(await fs.readFile(collectionPath, 'utf-8'));
    const collection = new Collection(collectionJson);
    const serverName = collection.name.replace(/\s+/g, '-').toLowerCase() || 'mcp-server';
    const openai = openAIApiKey ? new OpenAI({ apiKey: openAIApiKey }) : undefined;
    const tempDir = await fs.mkdtemp(path.join(process.cwd(), 'mcp-gen-'));
    try {
        const toolsDir = path.join(tempDir, 'tools');
        await fs.mkdir(toolsDir, { recursive: true });
        for (const item of collection.items.all()) {
            console.log(`Processing item: ${item.name || 'Unnamed'}`);
            if (!item.request) continue;
            const { fileName, content } = await generateToolFile(item, openai);
            await fs.writeFile(path.join(toolsDir, fileName), content);
            console.log(`Generated tool: ${fileName}`);
        }
        const templatesDir = path.join(__dirname, 'templates');
        const templateFiles = ['README.md.hbs', 'env.hbs', 'package.json.hbs', 'server.js.hbs'];
        for (const template of templateFiles) {
            let content = await fs.readFile(path.join(templatesDir, template), 'utf-8');
            content = content.replace(/{{serverName}}/g, serverName);
            // Inject the chosen server mode into the templates
            content = content.replace(/{{serverMode}}/g, serverMode);
            const outputFileName = template.replace('.hbs', '').replace('env', '.env.example');
            const destPath = path.join(tempDir, outputFileName);
            await fs.writeFile(destPath, content);
        }
        await zipDirectory(tempDir, outputZipPath);
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}
function zipDirectory(sourceDir, outPath) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fsSync.createWriteStream(outPath);
    return new Promise((resolve, reject) => {
        archive.directory(sourceDir, false).on('error', err => reject(err)).pipe(stream);
        stream.on('close', () => resolve());
        archive.finalize();
    });
}
module.exports = { generateMcpServer };
