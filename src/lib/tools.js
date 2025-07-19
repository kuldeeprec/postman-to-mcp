const { suggestToolDetails } = require('./openai');
const { inferInputSchema, inferOutputSchema } = require('./schema');

function sanitizeName(name) {
  let sanitized = name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
  const parts = sanitized.split('-');
  return parts[0].toLowerCase() + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

async function generateToolFile(item, openai) {
  const userFriendlyTitle = item.name || 'Unnamed Tool';
  let toolName = sanitizeName(userFriendlyTitle);
  let toolDescription = item.description?.toString() || `Handles the ${item.request?.method} request.`;
  if (openai && (!item.name || !item.description)) {
    const suggestion = await suggestToolDetails(item, openai);
    toolName = suggestion.name;
    toolDescription = suggestion.description;
  }
  const { schema: inputSchema } = inferInputSchema(item);
  const { schema: outputSchema } = inferOutputSchema(item);
  const url = item.request?.url.toString().replace(/{{/g, '{').replace(/}}/g, '}');
  const pathParams = item.request?.url.variables.all().map(v => v?.key || 'systemVariable') || [];
  const queryParams = item.request?.url.query.all().map(q => q?.key || 'systemquery') || [];
  const pathReplacements = pathParams.map(p => `.replace('{${p}}', input.${p})`).join('');
  const queryBuilder = queryParams.length > 0
    ? `const query = new URLSearchParams();\n` + queryParams.map(q => `  if (input.${q}) query.append('${q}', String(input.${q}));`).join('\n') + `\n  url += '?' + query.toString();`
    : '';
  const bodyLogic = item.request?.body?.raw ? `body: JSON.stringify(input.body),` : '';
  const content = `import { z } from 'zod';


export const name = "${toolName}";
export const title = "${userFriendlyTitle}";
export const description = "${toolDescription}";

export const inputSchema = ${inputSchema};
export const outputSchema = ${outputSchema};

export const handler = async  (input) => {
  let url = \`${url}\`${pathReplacements};
  ${queryBuilder}
  const options = {
    method: '${item.request?.method || 'GET'}',
    headers: {
      'Content-Type': 'application/json',
      // Add other necessary headers from your collection here, e.g., from process.env
      // 'Authorization': \`Bearer \${process.env.API_KEY}\`
    },
    ${bodyLogic}
  };
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(\`API call failed with status \${response.status}: \${errorBody}\`);
    }
    const data = await response.json();
    // Validate the output and wrap it in the MCP content format
    const validatedData = outputSchema.parse(data);
     const jsonString = JSON.stringify(validatedData, null, 2);
       return { content: [{ type: "text", text: jsonString, }] };
  } catch (error) {
    console.error(\`Error in ${toolName} tool:\`, error);
    return { content: [{ type: "text", text: \`Error executing tool ${toolName}: \${error.message}\` }], isError: true };
  }
}
`;
  return { fileName: `${toolName}.js`, content };
}
module.exports = { generateToolFile };
