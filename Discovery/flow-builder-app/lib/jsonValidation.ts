// JSON validation and extraction utilities for Typebot schemas

export interface TypebotJSON {
    workspaceId: string;
    typebot: {
        name: string;
        groups: any[];
        edges: any[];
        variables?: any[];
        events?: any[];
        theme?: any;
        settings?: any;
        [key: string]: any;
    };
}

export interface ValidationResult {
    valid: boolean;
    data?: TypebotJSON;
    errors?: string[];
}

/**
 * Extract JSON from text that may contain markdown fences or extra content
 */
export function extractJSONFromText(text: string): string | null {
    // Try to find JSON within markdown code fences
    const markdownMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (markdownMatch) {
        return markdownMatch[1].trim();
    }

    // Try to find raw JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return jsonMatch[0].trim();
    }

    // If the entire text looks like JSON, return it
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return trimmed;
    }

    return null;
}

/**
 * Parse and validate Typebot JSON from agent response
 */
export function parseTypebotJSON(text: string): ValidationResult {
    const errors: string[] = [];

    // Extract JSON from text
    const jsonString = extractJSONFromText(text);
    if (!jsonString) {
        return {
            valid: false,
            errors: ['No valid JSON found in response. Please ask the agent to output JSON only.'],
        };
    }

    // Parse JSON
    let parsed: any;
    try {
        parsed = JSON.parse(jsonString);
    } catch (error) {
        return {
            valid: false,
            errors: [
                'Invalid JSON syntax.',
                error instanceof Error ? error.message : 'Unknown parse error',
            ],
        };
    }

    // Validate schema
    return validateTypebotSchema(parsed);
}

/**
 * Validate that parsed JSON matches Typebot schema requirements
 */
export function validateTypebotSchema(json: any): ValidationResult {
    const errors: string[] = [];

    // Check top-level shape
    if (typeof json !== 'object' || json === null) {
        errors.push('JSON must be an object');
        return { valid: false, errors };
    }

    // Check workspaceId
    if (!json.workspaceId || typeof json.workspaceId !== 'string') {
        errors.push('Missing or invalid "workspaceId" field');
    }

    // Check typebot object
    if (!json.typebot || typeof json.typebot !== 'object') {
        errors.push('Missing or invalid "typebot" object');
        return { valid: false, errors };
    }

    const { typebot } = json;

    // Check required typebot fields
    if (!typebot.name || typeof typebot.name !== 'string') {
        errors.push('Typebot must have a "name" field');
    }

    if (!Array.isArray(typebot.groups)) {
        errors.push('Typebot must have a "groups" array');
    }

    if (!Array.isArray(typebot.edges)) {
        errors.push('Typebot must have an "edges" array');
    }

    // Optional fields validation
    if (typebot.variables && !Array.isArray(typebot.variables)) {
        errors.push('Typebot "variables" must be an array if provided');
    }

    if (typebot.events && !Array.isArray(typebot.events)) {
        errors.push('Typebot "events" must be an array if provided');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        data: json as TypebotJSON,
    };
}

/**
 * Format JSON for display with proper indentation
 */
export function formatJSON(json: any): string {
    return JSON.stringify(json, null, 2);
}

/**
 * Download JSON as a file
 */
export function downloadJSON(json: any, filename: string = 'typebot-flow.json'): void {
    const jsonString = formatJSON(json);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
