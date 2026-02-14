import { describe, test, expect } from 'vitest';
import {
  normalizeOrgName,
  scoreContactForCompany,
  scoreContactForOpportunity,
} from './match';

describe('network/match.ts', () => {
  describe('normalizeOrgName', () => {
    test('converts to lowercase', () => {
      expect(normalizeOrgName('Google LLC')).toBe('google');
    });

    test('removes common suffixes: Inc, LLC, Ltd, Corp, Corporation, Company, Co', () => {
      expect(normalizeOrgName('Acme Inc')).toBe('acme');
      expect(normalizeOrgName('Acme LLC')).toBe('acme');
      expect(normalizeOrgName('Acme Ltd')).toBe('acme');
      expect(normalizeOrgName('Acme Corp')).toBe('acme');
      expect(normalizeOrgName('Acme Corporation')).toBe('acme');
      expect(normalizeOrgName('Acme Company')).toBe('acme');
      expect(normalizeOrgName('Acme Co')).toBe('acme');
    });

    test('removes punctuation', () => {
      expect(normalizeOrgName("O'Reilly Media, Inc.")).toBe('oreilly media');
    });

    test('normalizes multiple spaces', () => {
      expect(normalizeOrgName('Acme   Corporation   Inc')).toBe('acme');
    });

    test('handles empty string', () => {
      expect(normalizeOrgName('')).toBe('');
    });

    test('handles company name with multiple suffixes', () => {
      expect(normalizeOrgName('Acme Corporation, Inc.')).toBe('acme');
    });
  });

  describe('scoreContactForCompany', () => {
    test('returns 100 for exact match', () => {
      const score = scoreContactForCompany({
        contactCompany: 'Google LLC',
        targetCompany: 'Google Inc',
      });
      expect(score).toBe(100);
    });

    test('returns 80 for partial match (one contains the other)', () => {
      const score = scoreContactForCompany({
        contactCompany: 'Google',
        targetCompany: 'Google Cloud',
      });
      expect(score).toBe(80);
    });

    test('returns 60 for 2+ token overlap', () => {
      const score = scoreContactForCompany({
        contactCompany: 'Microsoft Azure Services',
        targetCompany: 'Azure Cloud Services',
      });
      expect(score).toBe(60);
    });

    test('returns 35 for single token overlap', () => {
      const score = scoreContactForCompany({
        contactCompany: 'Amazon Web Services',
        targetCompany: 'Amazon Retail',
      });
      expect(score).toBe(35);
    });

    test('returns 0 for no match', () => {
      const score = scoreContactForCompany({
        contactCompany: 'Google',
        targetCompany: 'Amazon',
      });
      expect(score).toBe(0);
    });

    test('returns 0 when contactCompany is null', () => {
      const score = scoreContactForCompany({
        contactCompany: null,
        targetCompany: 'Google',
      });
      expect(score).toBe(0);
    });

    test('returns 0 when targetCompany is null', () => {
      const score = scoreContactForCompany({
        contactCompany: 'Google',
        targetCompany: null,
      });
      expect(score).toBe(0);
    });

    test('returns 0 when both are null', () => {
      const score = scoreContactForCompany({
        contactCompany: null,
        targetCompany: null,
      });
      expect(score).toBe(0);
    });

    test('handles company suffixes correctly', () => {
      const score = scoreContactForCompany({
        contactCompany: 'Acme Corporation',
        targetCompany: 'Acme Inc',
      });
      expect(score).toBe(100);
    });
  });

  describe('scoreContactForOpportunity', () => {
    test('scores exact company match highly', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Google LLC',
          title: 'Software Engineer',
          strength: 3,
          tags: null,
          hiringSignal: false,
        },
        targetCompany: 'Google Inc',
      });
      // 100 * 0.75 = 75 base score
      // strength 3 = (3-1)*2.5 = 5
      // Total = 80
      expect(score).toBe(80);
    });

    test('adds hiring signal boost (+10)', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Google LLC',
          title: 'Software Engineer',
          strength: 3,
          tags: null,
          hiringSignal: true,
        },
        targetCompany: 'Google Inc',
      });
      // 75 + 5 (strength) + 10 (hiringSignal) = 90
      expect(score).toBe(90);
    });

    test('adds hiring title boost (+6)', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Google LLC',
          title: 'Recruiter',
          strength: 3,
          tags: null,
          hiringSignal: false,
        },
        targetCompany: 'Google Inc',
      });
      // 75 + 5 (strength) + 6 (hiring title) = 86
      expect(score).toBe(86);
    });

    test('detects various hiring titles', () => {
      const titles = [
        'Technical Recruiter',
        'Talent Acquisition Manager',
        'People Ops Lead',
        'HR Business Partner',
        'Human Resources Manager',
        'Hiring Manager',
      ];

      titles.forEach((title) => {
        const score = scoreContactForOpportunity({
          contact: {
            company: 'Google LLC',
            title,
            strength: 3,
            tags: null,
            hiringSignal: false,
          },
          targetCompany: 'Google Inc',
        });
        expect(score).toBeGreaterThanOrEqual(86);
      });
    });

    test('adds recruiter tag boost (+6)', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Google LLC',
          title: 'Software Engineer',
          strength: 3,
          tags: 'recruiter',
          hiringSignal: false,
        },
        targetCompany: 'Google Inc',
      });
      // 75 + 5 + 6 = 86
      expect(score).toBe(86);
    });

    test('adds hiring tag boost (+6)', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Google LLC',
          title: 'Software Engineer',
          strength: 3,
          tags: 'hiring',
          hiringSignal: false,
        },
        targetCompany: 'Google Inc',
      });
      // 75 + 5 + 6 = 86
      expect(score).toBe(86);
    });

    test('adds referral tag boost (+4)', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Google LLC',
          title: 'Software Engineer',
          strength: 3,
          tags: 'referral',
          hiringSignal: false,
        },
        targetCompany: 'Google Inc',
      });
      // 75 + 5 + 4 = 84
      expect(score).toBe(84);
    });

    test('handles multiple tags (comma-separated)', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Google LLC',
          title: 'Software Engineer',
          strength: 3,
          tags: 'recruiter, hiring, referral',
          hiringSignal: true,
        },
        targetCompany: 'Google Inc',
      });
      // 75 + 5 + 10 (hiringSignal) + 6 (recruiter) + 6 (hiring) + 4 (referral) = 106
      // Clamped to 100
      expect(score).toBe(100);
    });

    test('strength affects score (1-5 range)', () => {
      const baseContact = {
        company: 'Google LLC',
        title: 'Engineer',
        tags: null,
        hiringSignal: false,
      };

      const score1 = scoreContactForOpportunity({
        contact: { ...baseContact, strength: 1 },
        targetCompany: 'Google Inc',
      });
      const score5 = scoreContactForOpportunity({
        contact: { ...baseContact, strength: 5 },
        targetCompany: 'Google Inc',
      });

      // strength 1 = 0, strength 5 = 10
      expect(score5).toBe(score1 + 10);
    });

    test('clamps strength to 1-5 range', () => {
      const baseContact = {
        company: 'Google LLC',
        title: 'Engineer',
        tags: null,
        hiringSignal: false,
      };

      const scoreNegative = scoreContactForOpportunity({
        contact: { ...baseContact, strength: -5 },
        targetCompany: 'Google Inc',
      });
      const score0 = scoreContactForOpportunity({
        contact: { ...baseContact, strength: 0 },
        targetCompany: 'Google Inc',
      });
      const score1 = scoreContactForOpportunity({
        contact: { ...baseContact, strength: 1 },
        targetCompany: 'Google Inc',
      });
      const score10 = scoreContactForOpportunity({
        contact: { ...baseContact, strength: 10 },
        targetCompany: 'Google Inc',
      });
      const score5 = scoreContactForOpportunity({
        contact: { ...baseContact, strength: 5 },
        targetCompany: 'Google Inc',
      });

      // All out-of-range values should be clamped
      expect(scoreNegative).toBe(score1);
      expect(score0).toBe(score1);
      expect(score10).toBe(score5);
    });

    test('returns 0 for no company match', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Amazon',
          title: 'Recruiter',
          strength: 5,
          tags: 'recruiter, hiring',
          hiringSignal: true,
        },
        targetCompany: 'Google',
      });
      // 0 * 0.75 = 0 base, + strength(10) + hiringSignal(10) + title(6) + tags(12) = 38
      expect(score).toBe(38);
    });

    test('handles null company gracefully', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: null,
          title: 'Engineer',
          strength: 3,
          tags: null,
          hiringSignal: false,
        },
        targetCompany: 'Google',
      });
      // No company match = 0 base + strength(5) = 5
      expect(score).toBe(5);
    });

    test('handles null strength (defaults to 3)', () => {
      const score = scoreContactForOpportunity({
        contact: {
          company: 'Google LLC',
          title: 'Engineer',
          strength: null,
          tags: null,
          hiringSignal: false,
        },
        targetCompany: 'Google Inc',
      });
      // 75 + (3-1)*2.5 = 75 + 5 = 80
      expect(score).toBe(80);
    });
  });
});
