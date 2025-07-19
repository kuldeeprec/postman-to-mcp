
function getZodType(value) {
    if (!isNaN(parseFloat(value)) && isFinite(value)) return 'z.number()';
    if (typeof value === 'boolean' || value === 'true' || value === 'false') return 'z.boolean()';
    return 'z.string()';
}
function inferInputSchema(item) {
    const properties = [];
    item.request?.url.variables.each(variable => {
        properties.push(`  "${variable?.key || 'systemVariable'}": ${getZodType(variable.value)}.describe('${variable.description?.toString().replace(/'/g, "\\'") || `Path parameter: ${variable.key}`}')`);
    });

    item.request?.url.query.each(query => {
        properties.push(`  "${query?.key || 'systemquery'}": ${getZodType(query.value)}.optional().describe('${query.description?.toString().replace(/'/g, "\\'") || `Query parameter: ${query.key}`}')`);
    });

    if (item.request?.body?.mode === 'raw' && item.request.body.raw) {
        try {
            const bodyJson = JSON.parse(item.request.body.raw);
            const bodySchema = Object.keys(bodyJson).map(key => `    "${key}": ${getZodType(bodyJson[key])}`).join(',\n');
            properties.push(`  "body": z.object({\n${bodySchema}\n  }).optional()`);
        } catch (e) {
            properties.push(`  "body": z.any().optional().describe('JSON request body')`);
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
 */
function inferOutputSchema(item) {
    let targetResponse = null;

    if (item.responses && item.responses.count() > 0) {
        for (const res of item.responses.all()) {
            if (res.code === 200 || res.code === 201) {
                targetResponse = res;
                break;
            }
        }

        if (!targetResponse) {
            targetResponse = item.responses.all()[0];
        }
    }

    if (targetResponse && targetResponse.body) {
        try {
            const jsonBody = JSON.parse(targetResponse.body);
            if (typeof jsonBody === 'object' && jsonBody !== null) {
                const schemaParts = Object.entries(jsonBody).map(([key, value]) => `    "${key}": ${getZodType(value)}`);
                if (schemaParts.length > 0) {
                    return { schema: `({\n${schemaParts.join(',\n')}\n  })` };
                }
            }
        } catch (e) {
            // Fallback handled below
        }
    }
    return { schema: `z.any().describe('The successful response from the API.')` };
}

module.exports = { inferInputSchema, inferOutputSchema };
