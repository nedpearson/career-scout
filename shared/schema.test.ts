import { describe, test, expect } from 'vitest';
import {
  insertUserSchema,
  insertJobSchema,
  insertApplicationSchema,
  insertContactSchema,
  insertDailyActionSchema,
  insertScriptSchema,
  insertResumeProfileSchema,
  insertSearchHistorySchema,
  insertJobArchetypeSchema,
  insertInterviewStorySchema,
  insertOutreachTemplateSchema,
  insertExternalAccountSchema,
  insertWeeklyPlanSchema,
  insertCalendarEventSchema,
} from './schema';

describe('schema.ts - Zod validation', () => {
  describe('insertUserSchema', () => {
    test('accepts valid user data', () => {
      const validUser = {
        username: 'testuser',
        password: 'securePassword123',
      };

      const result = insertUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    test('rejects missing username', () => {
      const invalidUser = {
        password: 'securePassword123',
      };

      const result = insertUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    test('rejects missing password', () => {
      const invalidUser = {
        username: 'testuser',
      };

      const result = insertUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    test('omits id field', () => {
      const userWithId = {
        id: '123',
        username: 'testuser',
        password: 'password',
      };

      const result = insertUserSchema.safeParse(userWithId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('id');
      }
    });
  });

  describe('insertJobSchema', () => {
    test('accepts valid job data with required fields', () => {
      const validJob = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
      };

      const result = insertJobSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    test('accepts job data with all optional fields', () => {
      const fullJob = {
        title: 'Senior Developer',
        company: 'Big Tech',
        location: 'Remote',
        salary: '$120k-150k',
        description: 'Build cool stuff',
        requirements: 'React, Node.js',
        matchScore: 85,
        priority: 'high',
        source: 'LinkedIn',
        sourceUrl: 'https://linkedin.com/jobs/123',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
        contactPhone: '555-1234',
        contactLinkedIn: 'https://linkedin.com/in/johndoe',
        resumeVersion: 'operations',
        notes: 'Promising opportunity',
        isActive: true,
      };

      const result = insertJobSchema.safeParse(fullJob);
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const invalidJob = {
        title: 'Engineer',
        company: 'Company',
        // missing location
      };

      const result = insertJobSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });

    test('omits id and discoveredAt', () => {
      const jobWithOmittedFields = {
        id: 123,
        title: 'Engineer',
        company: 'Company',
        location: 'NYC',
        discoveredAt: new Date(),
      };

      const result = insertJobSchema.safeParse(jobWithOmittedFields);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('id');
        expect(result.data).not.toHaveProperty('discoveredAt');
      }
    });
  });

  describe('insertApplicationSchema', () => {
    test('accepts valid application data', () => {
      const validApplication = {
        jobId: 1,
        status: 'applied',
      };

      const result = insertApplicationSchema.safeParse(validApplication);
      expect(result.success).toBe(true);
    });

    test('accepts application with optional fields', () => {
      const fullApplication = {
        jobId: 1,
        status: 'interviewing',
        appliedAt: new Date(),
        followUpDate: new Date(),
        interviewDate: new Date(),
        notes: 'First round interview scheduled',
        responseReceived: true,
      };

      const result = insertApplicationSchema.safeParse(fullApplication);
      expect(result.success).toBe(true);
    });

    test('rejects missing jobId', () => {
      const invalidApplication = {
        status: 'applied',
      };

      const result = insertApplicationSchema.safeParse(invalidApplication);
      expect(result.success).toBe(false);
    });

    test('omits id and createdAt', () => {
      const applicationWithOmitted = {
        id: 456,
        jobId: 1,
        status: 'applied',
        createdAt: new Date(),
      };

      const result = insertApplicationSchema.safeParse(applicationWithOmitted);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('id');
        expect(result.data).not.toHaveProperty('createdAt');
      }
    });
  });

  describe('insertContactSchema', () => {
    test('accepts valid contact with required name', () => {
      const validContact = {
        name: 'Jane Smith',
      };

      const result = insertContactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    test('accepts contact with all optional fields', () => {
      const fullContact = {
        name: 'John Doe',
        company: 'Tech Corp',
        title: 'Engineering Manager',
        email: 'john@example.com',
        phone: '555-1234',
        linkedIn: 'https://linkedin.com/in/johndoe',
        relationship: 'former colleague',
        source: 'linkedin_import',
        isMutualConnection: true,
        mutualConnectionWith: 'Alice Johnson',
        notes: 'Met at conference',
        lastContactedAt: new Date(),
      };

      const result = insertContactSchema.safeParse(fullContact);
      expect(result.success).toBe(true);
    });

    test('rejects missing name', () => {
      const invalidContact = {
        company: 'Company',
        title: 'Engineer',
      };

      const result = insertContactSchema.safeParse(invalidContact);
      expect(result.success).toBe(false);
    });
  });

  describe('insertDailyActionSchema', () => {
    test('accepts valid daily action', () => {
      const validAction = {
        title: 'Follow up with recruiter',
        actionType: 'follow_up',
      };

      const result = insertDailyActionSchema.safeParse(validAction);
      expect(result.success).toBe(true);
    });

    test('accepts action with all fields', () => {
      const fullAction = {
        title: 'Apply to position',
        description: 'Submit application for senior role',
        actionType: 'apply',
        priority: 'high',
        relatedJobId: 1,
        relatedContactId: 2,
        dueDate: new Date(),
        isCompleted: false,
        completedAt: null,
      };

      const result = insertDailyActionSchema.safeParse(fullAction);
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const invalidAction = {
        title: 'Do something',
        // missing actionType
      };

      const result = insertDailyActionSchema.safeParse(invalidAction);
      expect(result.success).toBe(false);
    });
  });

  describe('insertScriptSchema', () => {
    test('accepts valid script', () => {
      const validScript = {
        title: 'LinkedIn Outreach',
        scriptType: 'linkedin_dm',
        content: 'Hi, I saw your post...',
      };

      const result = insertScriptSchema.safeParse(validScript);
      expect(result.success).toBe(true);
    });

    test('rejects missing content', () => {
      const invalidScript = {
        title: 'Email',
        scriptType: 'email',
        // missing content
      };

      const result = insertScriptSchema.safeParse(invalidScript);
      expect(result.success).toBe(false);
    });
  });

  describe('insertResumeProfileSchema', () => {
    test('accepts valid resume profile', () => {
      const validProfile = {
        name: 'John Doe',
        email: 'john@example.com',
        summary: 'Experienced developer',
        skills: ['JavaScript', 'React', 'Node.js'],
      };

      const result = insertResumeProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    test('accepts profile with complex nested data', () => {
      const complexProfile = {
        name: 'Jane Smith',
        experience: [
          {
            title: 'Senior Developer',
            company: 'Tech Corp',
            location: 'SF',
            dates: '2020-2023',
            bullets: ['Built features', 'Led team'],
          },
        ],
        education: [
          {
            school: 'University',
            degree: 'BS Computer Science',
            dates: '2016-2020',
          },
        ],
        resumeAnalysis: {
          strengths: ['Technical skills'],
          weaknesses: ['Limited management experience'],
          suggestions: ['Add metrics'],
          keySkills: ['React', 'Node.js'],
          experienceLevel: 'Senior',
          industryFocus: ['Tech'],
          overallScore: 85,
        },
      };

      const result = insertResumeProfileSchema.safeParse(complexProfile);
      expect(result.success).toBe(true);
    });

    test('rejects missing name', () => {
      const invalidProfile = {
        email: 'test@example.com',
      };

      const result = insertResumeProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });

  describe('insertCalendarEventSchema', () => {
    test('accepts valid calendar event', () => {
      const validEvent = {
        title: 'Interview with Tech Corp',
        eventType: 'interview',
        startTime: new Date('2024-03-15T10:00:00'),
      };

      const result = insertCalendarEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const invalidEvent = {
        title: 'Meeting',
        // missing eventType and startTime
      };

      const result = insertCalendarEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    test('accepts event with all optional fields', () => {
      const fullEvent = {
        title: 'Technical Interview',
        eventType: 'interview',
        description: 'Second round technical screening',
        startTime: new Date('2024-03-15T10:00:00'),
        endTime: new Date('2024-03-15T11:00:00'),
        location: 'https://zoom.us/j/123456',
        relatedJobId: 1,
        relatedContactId: 2,
        reminderMinutes: 30,
        reminderSent: false,
        isCompleted: false,
        notes: 'Prepare system design questions',
      };

      const result = insertCalendarEventSchema.safeParse(fullEvent);
      expect(result.success).toBe(true);
    });
  });

  describe('insertWeeklyPlanSchema', () => {
    test('accepts valid weekly plan', () => {
      const validPlan = {
        weekStartDate: new Date('2024-03-11'),
        goals: ['Apply to 10 jobs', 'Network with 5 people'],
        targetApplications: 10,
      };

      const result = insertWeeklyPlanSchema.safeParse(validPlan);
      expect(result.success).toBe(true);
    });

    test('rejects missing weekStartDate', () => {
      const invalidPlan = {
        goals: ['Goal 1'],
      };

      const result = insertWeeklyPlanSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });
  });

  describe('insertJobArchetypeSchema', () => {
    test('accepts valid job archetype', () => {
      const validArchetype = {
        name: 'Sales Operations',
        description: 'Sales operations and analytics roles',
        seniorityLevel: 'senior',
      };

      const result = insertJobArchetypeSchema.safeParse(validArchetype);
      expect(result.success).toBe(true);
    });

    test('accepts archetype with complex fields', () => {
      const complexArchetype = {
        name: 'Technical Sales',
        typicalTitles: ['Sales Engineer', 'Solutions Architect'],
        atsKeywords: ['B2B', 'SaaS', 'Enterprise'],
        searchStrings: {
          linkedin: 'Sales Engineer',
          indeed: 'Technical Sales',
          google: 'Solutions Architect',
        },
      };

      const result = insertJobArchetypeSchema.safeParse(complexArchetype);
      expect(result.success).toBe(true);
    });

    test('rejects missing name', () => {
      const invalidArchetype = {
        description: 'Some description',
      };

      const result = insertJobArchetypeSchema.safeParse(invalidArchetype);
      expect(result.success).toBe(false);
    });
  });

  describe('insertInterviewStorySchema', () => {
    test('accepts valid STAR story', () => {
      const validStory = {
        title: 'Successful Product Launch',
        storyType: 'leadership',
        situation: 'Product was behind schedule',
        task: 'Needed to launch on time',
        action: 'Reorganized team and prioritized features',
        result: 'Launched on time with 95% satisfaction',
      };

      const result = insertInterviewStorySchema.safeParse(validStory);
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const invalidStory = {
        title: 'Story',
        // missing storyType
      };

      const result = insertInterviewStorySchema.safeParse(invalidStory);
      expect(result.success).toBe(false);
    });
  });

  describe('insertOutreachTemplateSchema', () => {
    test('accepts valid outreach template', () => {
      const validTemplate = {
        name: 'LinkedIn Introduction',
        templateType: 'linkedin_dm',
        content: 'Hi {name}, I noticed...',
      };

      const result = insertOutreachTemplateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    test('rejects missing required fields', () => {
      const invalidTemplate = {
        name: 'Template',
        // missing templateType and content
      };

      const result = insertOutreachTemplateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });
  });

  describe('insertExternalAccountSchema', () => {
    test('accepts valid external account', () => {
      const validAccount = {
        platform: 'linkedin',
        profileUrl: 'https://linkedin.com/in/johndoe',
        isConnected: true,
      };

      const result = insertExternalAccountSchema.safeParse(validAccount);
      expect(result.success).toBe(true);
    });

    test('rejects missing platform', () => {
      const invalidAccount = {
        profileUrl: 'https://indeed.com/profile',
      };

      const result = insertExternalAccountSchema.safeParse(invalidAccount);
      expect(result.success).toBe(false);
    });
  });

  describe('insertSearchHistorySchema', () => {
    test('accepts valid search history', () => {
      const validSearch = {
        query: 'Senior Developer',
        location: 'San Francisco',
        resultsCount: 50,
        newJobsFound: 10,
      };

      const result = insertSearchHistorySchema.safeParse(validSearch);
      expect(result.success).toBe(true);
    });

    test('rejects missing query', () => {
      const invalidSearch = {
        location: 'NYC',
      };

      const result = insertSearchHistorySchema.safeParse(invalidSearch);
      expect(result.success).toBe(false);
    });
  });
});
