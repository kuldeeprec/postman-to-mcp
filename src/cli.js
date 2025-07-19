#!/usr/bin/env node
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const inquirer = require('inquirer');
const { generateMcpServer } = require('./generator');

yargs(hideBin(process.argv))
    .command(
        '$0',
        'Generate an MCP server from a Postman Collection',
        (yargs) => {
            return yargs
                .option('input', {
                    alias: 'i',
                    type: 'string',
                    description: 'Path to the Postman Collection v2.0 JSON file',
                    demandOption: true,
                })
                .option('output', {
                    alias: 'o',
                    type: 'string',
                    description: 'Path for the output ZIP file',
                    default: 'mcp-server.zip',
                })
                .option('openai-key', {
                    alias: 'k',
                    type: 'string',
                    description: 'Optional OpenAI API key for generating names/descriptions',
                });
        },
        async (argv) => {
            try {
                // Step 1: Prompt the user to choose a server mode
                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'serverMode',
                        message: 'Choose the transport mode for your MCP server:',
                        choices: [
                            { name: 'Stdio (for local command-line tools)', value: 'stdio' },
                            { name: 'Stateless HTTP (simple, sessionless API)', value: 'http-stateless' },
                            { name: 'Stateful HTTP (manages user sessions)', value: 'http-session' },
                        ],
                    },
                ]);

                console.log('Starting MCP server generation...');
                // Step 2: Pass the chosen mode to the generator
                await generateMcpServer({
                    collectionPath: argv.input,
                    outputZipPath: argv.output,
                    openAIApiKey: argv['openai-key'],
                    serverMode: answers.serverMode,
                });
                console.log(` MCP Server successfully generated at ${argv.output}`);
            } catch (error) {
                console.error(' An error occurred during generation:', error);
                process.exit(1);
            }
        }
    )
    .help()
    .parse();
