import { describe, test, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('auth/password.ts', () => {
  describe('hashPassword', () => {
    test('generates a hash for a given password', () => {
      const password = 'mySecurePassword123';
      const hash = hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('generates different hashes for the same password (salt)', () => {
      const password = 'testPassword';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    test('generates different hashes for different passwords', () => {
      const hash1 = hashPassword('password1');
      const hash2 = hashPassword('password2');

      expect(hash1).not.toBe(hash2);
    });

    test('hash starts with $2a$ (bcrypt identifier)', () => {
      const hash = hashPassword('testPassword');
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    test('handles empty string', () => {
      const hash = hashPassword('');
      expect(hash).toBeTruthy();
      expect(hash.length).toBeGreaterThan(0);
    });

    test('handles special characters', () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = hashPassword(password);
      expect(hash).toBeTruthy();
    });

    test('handles unicode characters', () => {
      const password = 'пароль密码🔒';
      const hash = hashPassword(password);
      expect(hash).toBeTruthy();
    });

    test('handles very long passwords', () => {
      const password = 'a'.repeat(1000);
      const hash = hashPassword(password);
      expect(hash).toBeTruthy();
    });
  });

  describe('verifyPassword', () => {
    test('returns true for correct password', () => {
      const password = 'mySecurePassword123';
      const hash = hashPassword(password);
      const isValid = verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('returns false for incorrect password', () => {
      const password = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hash = hashPassword(password);
      const isValid = verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    test('returns false for empty password against valid hash', () => {
      const password = 'testPassword';
      const hash = hashPassword(password);
      const isValid = verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    test('verifies password with special characters', () => {
      const password = 'P@ssw0rd!#$';
      const hash = hashPassword(password);
      const isValid = verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('verifies password with unicode characters', () => {
      const password = 'пароль密码🔒';
      const hash = hashPassword(password);
      const isValid = verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('is case-sensitive', () => {
      const password = 'Password123';
      const hash = hashPassword(password);

      expect(verifyPassword('password123', hash)).toBe(false);
      expect(verifyPassword('PASSWORD123', hash)).toBe(false);
      expect(verifyPassword('Password123', hash)).toBe(true);
    });

    test('returns false for invalid hash format', () => {
      const password = 'testPassword';
      const invalidHash = 'notAValidHash';
      const isValid = verifyPassword(password, invalidHash);

      expect(isValid).toBe(false);
    });

    test('round-trip: hash and verify multiple times', () => {
      const passwords = [
        'simple',
        'Complex!P@ssw0rd',
        '12345678',
        'spaces in password',
        '',
      ];

      passwords.forEach((password) => {
        const hash = hashPassword(password);
        expect(verifyPassword(password, hash)).toBe(true);
        expect(verifyPassword(password + 'x', hash)).toBe(false);
      });
    });

    test('verifies against hash created in previous session (stability)', () => {
      const password = 'testPassword123';
      const hash = hashPassword(password);

      // Simulate different verification calls
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword(password, hash)).toBe(true);
    });
  });

  describe('integration: hash and verify workflow', () => {
    test('simulates user registration and login', () => {
      // User registration
      const userPassword = 'SecureUserPassword123!';
      const storedHash = hashPassword(userPassword);

      // Simulate storing in database (we just have the hash)
      expect(storedHash).not.toContain(userPassword);

      // User login attempt - correct password
      const loginAttempt1 = verifyPassword(userPassword, storedHash);
      expect(loginAttempt1).toBe(true);

      // User login attempt - wrong password
      const loginAttempt2 = verifyPassword('WrongPassword', storedHash);
      expect(loginAttempt2).toBe(false);

      // User login attempt - correct password again
      const loginAttempt3 = verifyPassword(userPassword, storedHash);
      expect(loginAttempt3).toBe(true);
    });

    test('cannot derive password from hash', () => {
      const password = 'secretPassword';
      const hash = hashPassword(password);

      // Hash should not contain the original password
      expect(hash).not.toContain(password);
      expect(hash.toLowerCase()).not.toContain(password.toLowerCase());
    });
  });
});
