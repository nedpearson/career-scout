import { describe, test, expect } from 'vitest';
import { computeMatchScore } from './matchScore';
import type { WorkMode } from '@prisma/client';

describe('matchScore.ts', () => {
  describe('computeMatchScore', () => {
    test('returns 0 when no skills and no preferences match', () => {
      const result = computeMatchScore({
        profile: null,
        skills: [],
        job: {
          title: 'Software Engineer',
          description: 'Build cool stuff',
          requirements: 'Experience required',
          workMode: 'HYBRID' as WorkMode,
        },
      });

      expect(result.score).toBe(0);
      expect(result.matchedSkills).toEqual([]);
      expect(result.notes).toContain('Add skills in Profile to improve scoring');
    });

    test('calculates skill coverage correctly (65% weight)', () => {
      const result = computeMatchScore({
        profile: null,
        skills: [
          { name: 'JavaScript', id: 1, profileId: 1, createdAt: new Date() },
          { name: 'React', id: 2, profileId: 1, createdAt: new Date() },
          { name: 'Node.js', id: 3, profileId: 1, createdAt: new Date() },
        ],
        job: {
          title: 'React Developer',
          description: 'Looking for JavaScript and React developer',
          requirements: 'Must know React',
          workMode: null,
        },
      });

      // 2 out of 3 skills matched = 2/3 coverage
      // Score = 65 * (2/3) ≈ 43.33 → 43
      expect(result.score).toBe(43);
      expect(result.matchedSkills).toHaveLength(2);
      expect(result.matchedSkills).toContain('JavaScript');
      expect(result.matchedSkills).toContain('React');
    });

    test('adds title preference bonus (20% weight)', () => {
      const result = computeMatchScore({
        profile: {
          id: 1,
          userId: 'user1',
          desiredTitles: 'Senior Developer, Lead Engineer',
          desiredWorkModes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        skills: [],
        job: {
          title: 'Senior Developer Position',
          description: 'Great role',
          requirements: null,
          workMode: null,
        },
      });

      // 0 skills matched = 0
      // Title match = 20
      // Total = 20
      expect(result.score).toBe(20);
      expect(result.notes).toContain('Title aligns with your target titles');
    });

    test('adds work mode preference bonus (15% weight)', () => {
      const result = computeMatchScore({
        profile: {
          id: 1,
          userId: 'user1',
          desiredTitles: null,
          desiredWorkModes: 'REMOTE, HYBRID',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        skills: [],
        job: {
          title: 'Software Engineer',
          description: 'Remote work available',
          requirements: null,
          workMode: 'REMOTE' as WorkMode,
        },
      });

      // 0 skills = 0
      // Work mode match = 15
      // Total = 15
      expect(result.score).toBe(15);
      expect(result.notes).toContain('Work mode matches your preference');
    });

    test('combines all scoring factors', () => {
      const result = computeMatchScore({
        profile: {
          id: 1,
          userId: 'user1',
          desiredTitles: 'Senior Engineer',
          desiredWorkModes: 'REMOTE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        skills: [
          { name: 'TypeScript', id: 1, profileId: 1, createdAt: new Date() },
          { name: 'React', id: 2, profileId: 1, createdAt: new Date() },
        ],
        job: {
          title: 'Senior Engineer - TypeScript/React',
          description: 'Build modern web apps with TypeScript and React',
          requirements: 'React expertise required',
          workMode: 'REMOTE' as WorkMode,
        },
      });

      // Both skills matched = 100% coverage = 65
      // Title matches = 20
      // Work mode matches = 15
      // Total = 100
      expect(result.score).toBe(100);
      expect(result.matchedSkills).toHaveLength(2);
      expect(result.notes).toContain('Matched skills: TypeScript, React');
      expect(result.notes).toContain('Title aligns with your target titles');
      expect(result.notes).toContain('Work mode matches your preference');
    });

    test('matches skills case-insensitively', () => {
      const result = computeMatchScore({
        profile: null,
        skills: [
          { name: 'javascript', id: 1, profileId: 1, createdAt: new Date() },
        ],
        job: {
          title: 'JavaScript Developer',
          description: 'Need JavaScript skills',
          requirements: null,
          workMode: null,
        },
      });

      expect(result.matchedSkills).toContain('javascript');
    });

    test('prioritizes longer skill names (greedy matching)', () => {
      const result = computeMatchScore({
        profile: null,
        skills: [
          { name: 'React', id: 1, profileId: 1, createdAt: new Date() },
          { name: 'React Native', id: 2, profileId: 1, createdAt: new Date() },
        ],
        job: {
          title: 'Mobile Developer',
          description: 'React Native experience required',
          requirements: null,
          workMode: null,
        },
      });

      // Both should match since "React Native" contains "React"
      expect(result.matchedSkills).toContain('React Native');
    });

    test('clamps score to 0-100 range', () => {
      const result = computeMatchScore({
        profile: {
          id: 1,
          userId: 'user1',
          desiredTitles: 'Engineer',
          desiredWorkModes: 'REMOTE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        skills: [
          { name: 'JavaScript', id: 1, profileId: 1, createdAt: new Date() },
        ],
        job: {
          title: 'Senior Engineer',
          description: 'JavaScript expert needed',
          requirements: null,
          workMode: 'REMOTE' as WorkMode,
        },
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    test('handles job with null description and requirements', () => {
      const result = computeMatchScore({
        profile: null,
        skills: [
          { name: 'Python', id: 1, profileId: 1, createdAt: new Date() },
        ],
        job: {
          title: 'Python Developer',
          description: null,
          requirements: null,
          workMode: null,
        },
      });

      expect(result.matchedSkills).toContain('Python');
    });

    test('limits matched skills display to 12 in notes', () => {
      const skills = Array.from({ length: 20 }, (_, i) => ({
        name: `Skill${i + 1}`,
        id: i + 1,
        profileId: 1,
        createdAt: new Date(),
      }));

      const jobText =
        'Looking for ' + skills.map((s) => s.name).join(', ') + ' skills';

      const result = computeMatchScore({
        profile: null,
        skills,
        job: {
          title: 'Full Stack Developer',
          description: jobText,
          requirements: null,
          workMode: null,
        },
      });

      // Should match all 20 skills
      expect(result.matchedSkills).toHaveLength(20);

      // But notes should only show first 12
      const skillsInNotes = result.notes.match(/Skill\d+/g) || [];
      expect(skillsInNotes.length).toBeLessThanOrEqual(12);
    });

    test('handles title match with partial string', () => {
      const result = computeMatchScore({
        profile: {
          id: 1,
          userId: 'user1',
          desiredTitles: 'developer',
          desiredWorkModes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        skills: [],
        job: {
          title: 'Senior Software Developer',
          description: null,
          requirements: null,
          workMode: null,
        },
      });

      expect(result.score).toBe(20);
    });

    test('work mode is case-insensitive', () => {
      const result = computeMatchScore({
        profile: {
          id: 1,
          userId: 'user1',
          desiredTitles: null,
          desiredWorkModes: 'remote, hybrid',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        skills: [],
        job: {
          title: 'Developer',
          description: null,
          requirements: null,
          workMode: 'REMOTE' as WorkMode,
        },
      });

      expect(result.score).toBe(15);
    });

    test('returns proper notes when no profile provided', () => {
      const result = computeMatchScore({
        profile: null,
        skills: [
          { name: 'JavaScript', id: 1, profileId: 1, createdAt: new Date() },
        ],
        job: {
          title: 'JavaScript Developer',
          description: 'JavaScript skills needed',
          requirements: null,
          workMode: null,
        },
      });

      expect(result.notes).toContain('Matched skills: JavaScript');
      expect(result.notes).not.toContain('Title aligns');
      expect(result.notes).not.toContain('Work mode matches');
    });
  });
});
