const { z } = require('zod');

function getZodType(value) {
    if (!isNaN(parseFloat(value)) && isFinite(value)) return 'z.number()';
    if (typeof value === 'boolean' || value === 'true' || value === 'false') return 'z.boolean()';
    return 'z.string()';
}

function inferInputSchema(item) {
    const properties = [];

    item.request?.url.variables.each(variable => {
        properties.push(`  ${variable.key}: ${getZodType(variable.value)}.describe('${variable.description?.toString().replace(/'/g, "\\'") || `Path parameter: ${variable.key}`}')`);
    });

    item.request?.url.query.each(query => {
        properties.push(`  ${query.key}: ${getZodType(query.value)}.optional().describe('${query.description?.toString().replace(/'/g, "\\'") || `Query parameter: ${query.key}`}')`);
    });

    if (item.request?.body?.mode === 'raw' && item.request.body.raw) {
        try {
            const bodyJson = JSON.parse(item.request.body.raw);
            const bodySchema = Object.keys(bodyJson).map(key => `    ${key}: ${getZodType(bodyJson[key])}`).join(',\n');
            properties.push(`  body: z.object({\n${bodySchema}\n  }).optional()`);
        } catch (e) {
            properties.push(`  body: z.any().optional().describe('JSON request body')`);
        }
    }

    if (properties.length === 0) {
        return { schema: '({})' };
    }

    return {
        schema: `({\n${properties.join(',\n')}\n})`,
    };
}

/**
 * Infers a Zod schema for a tool's output based on its example responses in the Postman collection.
 * The output schema defines the "contract" for the data that the tool will return[3][6].
 * @param {import('postman-collection').Item} item The Postman collection item.
 * @returns {{schema: string}} An object containing the generated Zod schema as a string.
 */
function inferOutputSchema(item) {
    let targetResponse = null;

    // Check if the item has any saved example responses.
    if (item.responses && item.responses.count() > 0) {
        // First, prioritize finding a successful response (HTTP 200 OK or 201 Created).
        // This is the most reliable source for a valid output schema.
        for (const res of item.responses.all()) {
            if (res.code === 200 || res.code === 201) {
                targetResponse = res;
                break; // Found the best possible response, so we can stop looking.
            }
        }

        // If no specific success response was found, fall back to the first available one.
        // This provides a schema even if only error examples are saved.
        if (!targetResponse) {
            targetResponse = item.responses.all()[0];
        }
    }

    // If we found a response to analyze, try to parse its body.
    if (targetResponse && targetResponse.body) {
        try {
            const jsonBody = JSON.parse(targetResponse.body);
            if (typeof jsonBody === 'object' && jsonBody !== null) {
                // Iterate over the keys of the JSON object to build a Zod schema shape.
                const schemaParts = Object.entries(jsonBody).map(([key, value]) => `    ${key}: ${getZodType(value)}`);

                // Only return an object schema if it actually has properties.
                if (schemaParts.length > 0) {
                    return { schema: `({\n${schemaParts.join(',\n')}\n  })` };
                }
            }
        } catch (e) {
            // If the response body isn't valid JSON, we'll ignore it and proceed to the fallback.
        }
    }

    // This is the crucial safety net. If no valid response example is found,
    // or if parsing fails, we return a generic `z.any()` schema.
    // This prevents the server from crashing during startup due to an invalid schema[5].
    return { schema: `z.any().describe('The successful response from the API.')` };
}

module.exports = { inferInputSchema, inferOutputSchema };
