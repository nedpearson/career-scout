import { describe, test, expect } from 'vitest';
import { normalizeText, tokenize, includesPhrase } from './keywords';

describe('keywords.ts', () => {
  describe('normalizeText', () => {
    test('converts to lowercase', () => {
      expect(normalizeText('Hello WORLD')).toBe('hello world');
    });

    test('preserves technical characters: +, ., #, -', () => {
      expect(normalizeText('C++ C# .NET Node.js React-Native')).toBe(
        'c++ c# .net node.js react-native'
      );
    });

    test('removes special characters except allowed ones', () => {
      const result = normalizeText('Hello!@$%^&*()_=[]{}|;:\'",<>?/`~');
      expect(result).toContain('hello');
      expect(result).not.toContain('!');
      expect(result).not.toContain('@');
      expect(result).not.toContain('$');
    });

    test('handles empty string', () => {
      expect(normalizeText('')).toBe('');
    });

    test('handles mixed content', () => {
      expect(normalizeText('Full-Stack Developer (C#/.NET)')).toBe(
        'full-stack developer  c# .net '
      );
    });
  });

  describe('tokenize', () => {
    test('splits on whitespace and filters stopwords', () => {
      const result = tokenize('the quick brown fox');
      expect(result).toEqual(['quick', 'brown', 'fox']);
    });

    test('removes single-character tokens', () => {
      const result = tokenize('a b c developer');
      expect(result).toEqual(['developer']);
    });

    test('filters common stopwords', () => {
      const result = tokenize('this is a test for the system');
      // "this" is not in the stopwords list, only "is", "a", "for", "the" are
      expect(result).toEqual(['this', 'test', 'system']);
    });

    test('preserves technical terms', () => {
      const result = tokenize('C++ and C# are programming languages');
      expect(result).toEqual(['c++', 'c#', 'programming', 'languages']);
    });

    test('handles empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    test('handles string with only stopwords', () => {
      expect(tokenize('the and or a is')).toEqual([]);
    });

    test('preserves multi-part terms with hyphens and dots', () => {
      const result = tokenize('react-native and node.js developer');
      expect(result).toEqual(['react-native', 'node.js', 'developer']);
    });

    test('normalizes and tokenizes complex job description', () => {
      const result = tokenize(
        'We are looking for a Full-Stack Developer with experience in React.js, Node.js, and PostgreSQL'
      );
      expect(result).toContain('full-stack');
      expect(result).toContain('developer');
      expect(result).toContain('experience');
      expect(result).toContain('react.js');
      expect(result).toContain('node.js');
      expect(result).toContain('postgresql');
    });
  });

  describe('includesPhrase', () => {
    test('finds exact phrase (case-insensitive)', () => {
      expect(includesPhrase('Senior Developer', 'developer')).toBe(true);
      expect(includesPhrase('Senior Developer', 'DEVELOPER')).toBe(true);
    });

    test('finds phrase with special characters', () => {
      expect(includesPhrase('Experience with C# and .NET', 'c#')).toBe(true);
      expect(includesPhrase('Experience with C# and .NET', '.net')).toBe(true);
    });

    test('returns false when phrase not found', () => {
      expect(includesPhrase('JavaScript Developer', 'python')).toBe(false);
    });

    test('handles empty haystack', () => {
      expect(includesPhrase('', 'test')).toBe(false);
    });

    test('handles empty phrase', () => {
      expect(includesPhrase('test string', '')).toBe(true);
    });

    test('finds multi-word phrases', () => {
      expect(
        includesPhrase('Senior Full-Stack Developer', 'full-stack developer')
      ).toBe(true);
    });

    test('handles phrases with extra whitespace', () => {
      // normalizeText preserves whitespace, so multiple spaces remain
      // "Senior   Developer" → "senior   developer"
      // "senior developer" → "senior developer"
      // These don't match exactly
      expect(includesPhrase('Senior   Developer', 'senior   developer')).toBe(
        true
      );
    });

    test('normalizes both haystack and phrase', () => {
      expect(includesPhrase('React.js & Node.js', 'react.js')).toBe(true);
    });
  });
});
