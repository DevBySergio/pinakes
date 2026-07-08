export interface JsonSchemaValidationIssue {
	path: string;
	message: string;
}

export interface JsonSchema {
	type?: JsonSchemaType | JsonSchemaType[];
	properties?: Record<string, JsonSchema>;
	required?: string[];
	additionalProperties?: boolean | JsonSchema;
	items?: JsonSchema;
	enum?: unknown[];
	minLength?: number;
	minimum?: number;
	maximum?: number;
	pattern?: string;
	not?: JsonSchema;
	format?: string;
}

type JsonSchemaType = 'array' | 'boolean' | 'integer' | 'null' | 'number' | 'object' | 'string';

export class JsonSchemaValidator {
	public validate(value: unknown, schema: JsonSchema): JsonSchemaValidationIssue[] {
		const issues: JsonSchemaValidationIssue[] = [];
		this.validateValue(value, schema, '$', issues);
		return issues;
	}

	private validateValue(value: unknown, schema: JsonSchema, currentPath: string, issues: JsonSchemaValidationIssue[]): void {
		if (schema.type && !matchesType(value, schema.type)) {
			issues.push({
				path: currentPath,
				message: `must be ${formatType(schema.type)}`,
			});
			return;
		}

		if (schema.enum && !schema.enum.some((entry) => valuesEqual(entry, value))) {
			issues.push({
				path: currentPath,
				message: `must be one of: ${schema.enum.map(formatValue).join(', ')}`,
			});
		}

		if (typeof value === 'string') {
			this.validateString(value, schema, currentPath, issues);
		}

		if (typeof value === 'number') {
			this.validateNumber(value, schema, currentPath, issues);
		}

		if (Array.isArray(value)) {
			this.validateArray(value, schema, currentPath, issues);
		}

		if (isRecord(value)) {
			this.validateObject(value, schema, currentPath, issues);
		}

		if (schema.not && this.matchesSchema(value, schema.not)) {
			issues.push({
				path: currentPath,
				message: formatNotMessage(schema.not),
			});
		}
	}

	private validateString(value: string, schema: JsonSchema, currentPath: string, issues: JsonSchemaValidationIssue[]): void {
		if (schema.minLength !== undefined && value.length < schema.minLength) {
			issues.push({
				path: currentPath,
				message: `must be at least ${schema.minLength} character(s)`,
			});
		}

		if (schema.pattern !== undefined && !(new RegExp(schema.pattern).test(value))) {
			issues.push({
				path: currentPath,
				message: `must match pattern ${schema.pattern}`,
			});
		}

		if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) {
			issues.push({
				path: currentPath,
				message: 'must be a valid date-time',
			});
		}
	}

	private validateNumber(value: number, schema: JsonSchema, currentPath: string, issues: JsonSchemaValidationIssue[]): void {
		if (schema.minimum !== undefined && value < schema.minimum) {
			issues.push({
				path: currentPath,
				message: `must be greater than or equal to ${schema.minimum}`,
			});
		}

		if (schema.maximum !== undefined && value > schema.maximum) {
			issues.push({
				path: currentPath,
				message: `must be less than or equal to ${schema.maximum}`,
			});
		}
	}

	private validateArray(value: unknown[], schema: JsonSchema, currentPath: string, issues: JsonSchemaValidationIssue[]): void {
		if (!schema.items) {
			return;
		}

		for (const [index, item] of value.entries()) {
			this.validateValue(item, schema.items, `${currentPath}[${index}]`, issues);
		}
	}

	private validateObject(value: Record<string, unknown>, schema: JsonSchema, currentPath: string, issues: JsonSchemaValidationIssue[]): void {
		const propertySchemas = schema.properties ?? {};
		for (const propertyName of schema.required ?? []) {
			if (!Object.prototype.hasOwnProperty.call(value, propertyName)) {
				issues.push({
					path: appendPath(currentPath, propertyName),
					message: 'is required',
				});
			}
		}

		for (const [propertyName, propertySchema] of Object.entries(propertySchemas)) {
			if (Object.prototype.hasOwnProperty.call(value, propertyName)) {
				this.validateValue(value[propertyName], propertySchema, appendPath(currentPath, propertyName), issues);
			}
		}

		for (const [propertyName, propertyValue] of Object.entries(value)) {
			if (Object.prototype.hasOwnProperty.call(propertySchemas, propertyName)) {
				continue;
			}

			if (schema.additionalProperties === false) {
				issues.push({
					path: appendPath(currentPath, propertyName),
					message: `must not include additional property "${propertyName}"`,
				});
			} else if (isJsonSchema(schema.additionalProperties)) {
				this.validateValue(propertyValue, schema.additionalProperties, appendPath(currentPath, propertyName), issues);
			}
		}
	}

	private matchesSchema(value: unknown, schema: JsonSchema): boolean {
		const issues: JsonSchemaValidationIssue[] = [];
		this.validateValue(value, schema, '$', issues);
		return issues.length === 0;
	}
}

function matchesType(value: unknown, expected: JsonSchemaType | JsonSchemaType[]): boolean {
	const expectedTypes = Array.isArray(expected) ? expected : [expected];
	return expectedTypes.some((type) => {
		switch (type) {
			case 'array':
				return Array.isArray(value);
			case 'boolean':
				return typeof value === 'boolean';
			case 'integer':
				return typeof value === 'number' && Number.isInteger(value);
			case 'null':
				return value === null;
			case 'number':
				return typeof value === 'number';
			case 'object':
				return isRecord(value);
			case 'string':
				return typeof value === 'string';
		}
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJsonSchema(value: unknown): value is JsonSchema {
	return isRecord(value);
}

function appendPath(base: string, propertyName: string): string {
	if (/^[A-Za-z_$][\w$]*$/.test(propertyName)) {
		return `${base}.${propertyName}`;
	}

	return `${base}[${JSON.stringify(propertyName)}]`;
}

function formatType(type: JsonSchemaType | JsonSchemaType[]): string {
	return Array.isArray(type) ? type.join(' or ') : type;
}

function formatValue(value: unknown): string {
	return typeof value === 'string' ? `"${value}"` : String(value);
}

function valuesEqual(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

function formatNotMessage(schema: JsonSchema): string {
	if (schema.pattern) {
		return `must not match pattern ${schema.pattern}`;
	}

	return 'must not match disallowed schema';
}
