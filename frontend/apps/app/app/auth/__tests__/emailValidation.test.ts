import { describe, it, expect } from 'vitest';
import { validateResetEmail } from '../forgot-password/page';

describe('Frontend Email Validation & Error Handling', () => {
    it('accepts valid email addresses with proper domain and host structure', () => {
        expect(validateResetEmail('john.doe@samta.ai').isValid).toBe(true);
        expect(validateResetEmail('alice@company.com').isValid).toBe(true);
        expect(validateResetEmail('test-user@sub.domain.org').isValid).toBe(true);
    });

    it('rejects empty email', () => {
        const result = validateResetEmail('   ');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Email address is required');
    });

    it('rejects email without @ symbol', () => {
        const result = validateResetEmail('invalidemail.com');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('symbol in the email address');
    });

    it('rejects email with invalid domain structure (e.g. single character host label)', () => {
        const result = validateResetEmail('user@t.com');
        expect(result.isValid).toBe(false);
    });

    it('rejects numeric-only local-part prefix', () => {
        const result = validateResetEmail('12345@domain.com');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('numeric-only');
    });

    it('rejects email with leading or trailing special characters in prefix', () => {
        expect(validateResetEmail('.user@domain.com').isValid).toBe(false);
        expect(validateResetEmail('user.@domain.com').isValid).toBe(false);
        expect(validateResetEmail('-user@domain.com').isValid).toBe(false);
    });

    it('rejects email without a valid top-level domain extension', () => {
        const result = validateResetEmail('user@domain');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('top-level domain extension');
    });
});
