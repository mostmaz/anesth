import { Response } from 'express';
import { limitProblem, NumberLimit } from '../shared/ranges';

// Thrown by the helpers below; turned into a 400 response by sendError().
export class BadRequest extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BadRequest';
    }
}

const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

// A number within clinical limits, or null when the field was left empty.
export function optionalNumber(value: unknown, limit: NumberLimit): number | null {
    if (isEmpty(value)) return null;
    const problem = limitProblem(value, limit);
    if (problem) throw new BadRequest(problem);
    return Number(value);
}

export function requiredNumber(value: unknown, limit: NumberLimit): number {
    if (isEmpty(value)) throw new BadRequest(`${limit.label} is required`);
    return optionalNumber(value, limit) as number;
}

export function optionalString(value: unknown, label: string, max = 2000): string | null {
    if (isEmpty(value)) return null;
    if (typeof value !== 'string') throw new BadRequest(`${label} must be text`);
    const text = value.trim();
    if (!text) return null;
    if (text.length > max) throw new BadRequest(`${label} is too long (maximum ${max} characters)`);
    return text;
}

export function requiredString(value: unknown, label: string, max = 500): string {
    const text = optionalString(value, label, max);
    if (!text) throw new BadRequest(`${label} is required`);
    return text;
}

export function oneOf<T extends string>(value: unknown, label: string, allowed: readonly T[]): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new BadRequest(`${label} must be one of: ${allowed.join(', ')}`);
    }
    return value as T;
}

export function optionalBoolean(value: unknown): boolean | undefined {
    if (isEmpty(value)) return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    throw new BadRequest('Expected true or false');
}

// A date that is not in the future (5 minutes of clock difference allowed).
export function optionalPastDate(value: unknown, label: string): Date | null {
    if (isEmpty(value)) return null;
    const date = new Date(value as string);
    if (isNaN(date.getTime())) throw new BadRequest(`${label} is not a valid date`);
    if (date.getTime() > Date.now() + 5 * 60_000) throw new BadRequest(`${label} cannot be in the future`);
    return date;
}

// One place that decides how a failed request is answered: validation problems
// and missing records get a useful message, everything else a generic 500
// (details go to the server log only).
export function sendError(res: Response, error: unknown, fallback: string) {
    const e = error as { name?: string; code?: string; message?: string };
    if (error instanceof BadRequest) return res.status(400).json({ error: error.message });
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
    if (e?.code === 'P2003') return res.status(400).json({ error: 'A referenced record does not exist' });
    if (e?.code === 'P2002') return res.status(409).json({ error: 'A record with these details already exists' });
    console.error(`${fallback}:`, e?.message || error);
    return res.status(500).json({ error: fallback });
}
