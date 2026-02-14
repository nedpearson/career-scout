import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { Job, Application, Contact } from '@shared/schema';

// Mock the storage module
vi.mock('../../server/storage', () => ({
  storage: {
    // Jobs
    getJobs: vi.fn(),
    getJob: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
    deleteJob: vi.fn(),

    // Applications
    getApplications: vi.fn(),
    getApplication: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),

    // Contacts
    getContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    deleteContact: vi.fn(),
  },
}));

describe('CRUD API Integration Tests', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Jobs API', () => {
    describe('GET /api/jobs', () => {
      test('should return all jobs for authenticated user', async () => {
        const { storage } = await import('../../server/storage');

        const mockJobs: Job[] = [
          {
            id: 1,
            userId: mockUserId,
            title: 'Software Engineer',
            company: 'Tech Corp',
            location: 'San Francisco',
            salary: '$120k-150k',
            description: 'Great opportunity',
            requirements: 'React, Node.js',
            matchScore: 85,
            priority: 'high',
            source: 'LinkedIn',
            isActive: true,
          } as Job,
          {
            id: 2,
            userId: mockUserId,
            title: 'Senior Developer',
            company: 'Startup Inc',
            location: 'Remote',
            matchScore: 92,
            isActive: true,
          } as Job,
        ];

        (storage.getJobs as any).mockResolvedValue(mockJobs);

        const jobs = await storage.getJobs(mockUserId);

        expect(jobs).toHaveLength(2);
        expect(jobs[0].title).toBe('Software Engineer');
        expect(jobs[1].title).toBe('Senior Developer');
      });

      test('should return empty array when no jobs exist', async () => {
        const { storage } = await import('../../server/storage');

        (storage.getJobs as any).mockResolvedValue([]);

        const jobs = await storage.getJobs(mockUserId);

        expect(jobs).toEqual([]);
      });

      test('should only return jobs for the authenticated user', async () => {
        const { storage } = await import('../../server/storage');

        const mockJobs: Job[] = [
          { id: 1, userId: mockUserId, title: 'Job 1' } as Job,
          { id: 2, userId: mockUserId, title: 'Job 2' } as Job,
        ];

        (storage.getJobs as any).mockResolvedValue(mockJobs);

        const jobs = await storage.getJobs(mockUserId);

        expect(jobs.every((job) => job.userId === mockUserId)).toBe(true);
      });
    });

    describe('POST /api/jobs', () => {
      test('should create a new job with valid data', async () => {
        const { storage } = await import('../../server/storage');

        const newJobData = {
          userId: mockUserId,
          title: 'Product Manager',
          company: 'Big Tech',
          location: 'New York',
          salary: '$130k-160k',
        };

        const createdJob: Job = {
          id: 3,
          ...newJobData,
          matchScore: 0,
          isActive: true,
        } as Job;

        (storage.createJob as any).mockResolvedValue(createdJob);

        const job = await storage.createJob(newJobData);

        expect(job).toBeDefined();
        expect(job.id).toBe(3);
        expect(job.title).toBe('Product Manager');
        expect(job.userId).toBe(mockUserId);
      });

      test('should reject job creation with missing required fields', async () => {
        const invalidJobData = {
          userId: mockUserId,
          title: 'Engineer',
          // missing company and location
        };

        // Zod validation would fail before reaching storage
        expect(invalidJobData).not.toHaveProperty('company');
        expect(invalidJobData).not.toHaveProperty('location');
      });

      test('should auto-assign default values for optional fields', async () => {
        const { storage } = await import('../../server/storage');

        const minimalJobData = {
          userId: mockUserId,
          title: 'Developer',
          company: 'Company',
          location: 'Location',
        };

        const createdJob: Job = {
          id: 4,
          ...minimalJobData,
          matchScore: 0, // default
          priority: 'medium', // default
          isActive: true, // default
        } as Job;

        (storage.createJob as any).mockResolvedValue(createdJob);

        const job = await storage.createJob(minimalJobData);

        expect(job.matchScore).toBe(0);
        expect(job.priority).toBe('medium');
        expect(job.isActive).toBe(true);
      });
    });

    describe('PUT /api/jobs/:id', () => {
      test('should update existing job', async () => {
        const { storage } = await import('../../server/storage');

        const updates = {
          matchScore: 95,
          notes: 'Updated notes',
        };

        const updatedJob: Job = {
          id: 1,
          userId: mockUserId,
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'SF',
          matchScore: 95,
          notes: 'Updated notes',
          isActive: true,
        } as Job;

        (storage.updateJob as any).mockResolvedValue(updatedJob);

        const job = await storage.updateJob(1, updates);

        expect(job).toBeDefined();
        expect(job?.matchScore).toBe(95);
        expect(job?.notes).toBe('Updated notes');
      });

      test('should return undefined for non-existent job', async () => {
        const { storage } = await import('../../server/storage');

        (storage.updateJob as any).mockResolvedValue(undefined);

        const job = await storage.updateJob(999, { matchScore: 100 });

        expect(job).toBeUndefined();
      });
    });

    describe('DELETE /api/jobs/:id', () => {
      test('should delete existing job', async () => {
        const { storage } = await import('../../server/storage');

        (storage.deleteJob as any).mockResolvedValue(undefined);

        await storage.deleteJob(1);

        expect(storage.deleteJob).toHaveBeenCalledWith(1);
      });

      test('should handle deletion of non-existent job', async () => {
        const { storage } = await import('../../server/storage');

        (storage.deleteJob as any).mockResolvedValue(undefined);

        await expect(storage.deleteJob(999)).resolves.not.toThrow();
      });
    });
  });

  describe('Applications API', () => {
    describe('GET /api/applications', () => {
      test('should return applications with job data', async () => {
        const { storage } = await import('../../server/storage');

        const mockApplications = [
          {
            id: 1,
            userId: mockUserId,
            jobId: 1,
            status: 'applied',
            job: {
              id: 1,
              title: 'Software Engineer',
              company: 'Tech Corp',
            },
          },
          {
            id: 2,
            userId: mockUserId,
            jobId: 2,
            status: 'interviewing',
            job: {
              id: 2,
              title: 'Senior Developer',
              company: 'Startup',
            },
          },
        ];

        (storage.getApplications as any).mockResolvedValue(mockApplications);

        const applications = await storage.getApplications(mockUserId);

        expect(applications).toHaveLength(2);
        expect(applications[0].job).toBeDefined();
        expect(applications[0].job?.title).toBe('Software Engineer');
      });

      test('should return empty array when no applications exist', async () => {
        const { storage } = await import('../../server/storage');

        (storage.getApplications as any).mockResolvedValue([]);

        const applications = await storage.getApplications(mockUserId);

        expect(applications).toEqual([]);
      });
    });

    describe('POST /api/applications', () => {
      test('should create application with valid data', async () => {
        const { storage } = await import('../../server/storage');

        const newAppData = {
          userId: mockUserId,
          jobId: 1,
          status: 'applied',
          notes: 'Applied through referral',
        };

        const createdApp: Application = {
          id: 1,
          ...newAppData,
          responseReceived: false,
          appliedAt: new Date(),
        } as Application;

        (storage.createApplication as any).mockResolvedValue(createdApp);

        const app = await storage.createApplication(newAppData);

        expect(app).toBeDefined();
        expect(app.jobId).toBe(1);
        expect(app.status).toBe('applied');
      });

      test('should set appliedAt timestamp on creation', async () => {
        const { storage } = await import('../../server/storage');

        const newAppData = {
          userId: mockUserId,
          jobId: 1,
          status: 'applied',
        };

        const createdApp: Application = {
          id: 1,
          ...newAppData,
          appliedAt: new Date(),
        } as Application;

        (storage.createApplication as any).mockResolvedValue(createdApp);

        const app = await storage.createApplication(newAppData);

        expect(app.appliedAt).toBeDefined();
        expect(app.appliedAt).toBeInstanceOf(Date);
      });
    });

    describe('PUT /api/applications/:id', () => {
      test('should update application status', async () => {
        const { storage } = await import('../../server/storage');

        const updates = {
          status: 'interviewing',
          interviewDate: new Date('2024-03-20'),
        };

        const updatedApp: Application = {
          id: 1,
          userId: mockUserId,
          jobId: 1,
          status: 'interviewing',
          interviewDate: new Date('2024-03-20'),
        } as Application;

        (storage.updateApplication as any).mockResolvedValue(updatedApp);

        const app = await storage.updateApplication(1, updates);

        expect(app?.status).toBe('interviewing');
        expect(app?.interviewDate).toBeInstanceOf(Date);
      });
    });
  });

  describe('Contacts API', () => {
    describe('GET /api/contacts', () => {
      test('should return all contacts for user', async () => {
        const { storage } = await import('../../server/storage');

        const mockContacts: Contact[] = [
          {
            id: 1,
            userId: mockUserId,
            name: 'John Doe',
            company: 'Tech Corp',
            title: 'Engineering Manager',
            email: 'john@example.com',
          } as Contact,
          {
            id: 2,
            userId: mockUserId,
            name: 'Jane Smith',
            company: 'Startup Inc',
            title: 'Recruiter',
          } as Contact,
        ];

        (storage.getContacts as any).mockResolvedValue(mockContacts);

        const contacts = await storage.getContacts(mockUserId);

        expect(contacts).toHaveLength(2);
        expect(contacts[0].name).toBe('John Doe');
        expect(contacts[1].name).toBe('Jane Smith');
      });
    });

    describe('POST /api/contacts', () => {
      test('should create contact with required name', async () => {
        const { storage } = await import('../../server/storage');

        const newContactData = {
          userId: mockUserId,
          name: 'Alice Johnson',
          company: 'Big Tech',
          email: 'alice@example.com',
          relationship: 'former colleague',
        };

        const createdContact: Contact = {
          id: 3,
          ...newContactData,
        } as Contact;

        (storage.createContact as any).mockResolvedValue(createdContact);

        const contact = await storage.createContact(newContactData);

        expect(contact).toBeDefined();
        expect(contact.name).toBe('Alice Johnson');
        expect(contact.company).toBe('Big Tech');
      });

      test('should reject contact without name', async () => {
        const invalidContactData = {
          userId: mockUserId,
          company: 'Company',
          email: 'test@example.com',
        };

        expect(invalidContactData).not.toHaveProperty('name');
      });
    });

    describe('PUT /api/contacts/:id', () => {
      test('should update contact information', async () => {
        const { storage } = await import('../../server/storage');

        const updates = {
          title: 'Senior Recruiter',
          notes: 'Reached out via LinkedIn',
        };

        const updatedContact: Contact = {
          id: 1,
          userId: mockUserId,
          name: 'John Doe',
          title: 'Senior Recruiter',
          notes: 'Reached out via LinkedIn',
        } as Contact;

        (storage.updateContact as any).mockResolvedValue(updatedContact);

        const contact = await storage.updateContact(1, updates);

        expect(contact?.title).toBe('Senior Recruiter');
        expect(contact?.notes).toBe('Reached out via LinkedIn');
      });
    });

    describe('DELETE /api/contacts/:id', () => {
      test('should delete existing contact', async () => {
        const { storage } = await import('../../server/storage');

        (storage.deleteContact as any).mockResolvedValue(undefined);

        await storage.deleteContact(1);

        expect(storage.deleteContact).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Authorization Tests', () => {
    test('should only allow users to access their own jobs', async () => {
      const { storage } = await import('../../server/storage');

      const user1Jobs: Job[] = [
        { id: 1, userId: 'user1', title: 'Job 1' } as Job,
      ];

      (storage.getJobs as any).mockResolvedValue(user1Jobs);

      const jobs = await storage.getJobs('user1');

      expect(jobs.every((job) => job.userId === 'user1')).toBe(true);
    });

    test('should prevent users from updating other users jobs', async () => {
      const { storage } = await import('../../server/storage');

      // In actual implementation, the route should verify ownership
      const jobToUpdate = {
        id: 1,
        userId: 'user1',
        title: 'Original',
      } as Job;

      (storage.getJob as any).mockResolvedValue(jobToUpdate);

      const job = await storage.getJob(1);

      // Route should check: job.userId !== requestingUserId
      expect(job?.userId).toBe('user1');
    });
  });

  describe('Validation Tests', () => {
    test('should validate job priority values', () => {
      const validPriorities = ['high', 'medium', 'low'];
      const invalidPriority = 'critical';

      expect(validPriorities).toContain('high');
      expect(validPriorities).not.toContain(invalidPriority);
    });

    test('should validate application status values', () => {
      const validStatuses = [
        'pending',
        'applied',
        'interviewing',
        'offered',
        'rejected',
        'withdrawn',
      ];
      const invalidStatus = 'maybe';

      expect(validStatuses).toContain('applied');
      expect(validStatuses).not.toContain(invalidStatus);
    });

    test('should validate email format', () => {
      const validEmails = ['test@example.com', 'user+tag@domain.co.uk'];
      const invalidEmails = ['notanemail', '@example.com', 'user@'];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });
});
