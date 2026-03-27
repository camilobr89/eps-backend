import { jest } from '@jest/globals';

/**
 * Creates a mock Prisma service with common methods
 * @param overrides Additional or overridden mock methods
 */
export const createMockPrismaService = (overrides: any = {}) => ({
  appointment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    ...overrides.appointment,
  },
  familyMember: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    ...overrides.familyMember,
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    ...overrides.user,
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    ...overrides.notification,
  },
  authorization: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    ...overrides.authorization,
  },
  epsProvider: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    ...overrides.epsProvider,
  },
  ...overrides,
});

/**
 * Creates a mock service with common CRUD methods
 * @param overrides Additional or overridden mock methods
 */
export const createMockService = (overrides: any = {}) => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findUpcoming: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  ...overrides,
});

/**
 * Creates a mock user object
 * @param overrides Additional or overridden user properties
 */
export const createMockUser = (overrides: any = {}) => ({
  id: 'user-uuid-1',
  email: 'test@example.com',
  fullName: 'Test User',
  emailNotifications: true,
  ...overrides,
});

/**
 * Creates a mock family member object
 * @param overrides Additional or overridden family member properties
 */
export const createMockFamilyMember = (overrides: any = {}) => ({
  id: 'member-uuid-1',
  userId: 'user-uuid-1',
  fullName: 'John Doe',
  documentType: 'CC' as const,
  documentNumber: '123456789',
  birthDate: new Date('1990-01-15'),
  address: 'Calle 123',
  phone: '1234567',
  cellphone: '3001234567',
  email: 'john@example.com',
  department: 'Antioquia',
  city: 'Medellín',
  regime: 'Contributivo',
  relationship: 'Hijo' as const,
  epsProvider: {
    id: 'eps-uuid-1',
    name: 'EPS Sura',
    code: 'EPS001',
  },
  ...overrides,
});

/**
 * Creates a mock appointment object
 * @param overrides Additional or overridden appointment properties
 */
export const createMockAppointment = (overrides: any = {}) => ({
  id: 'appt-uuid-1',
  familyMemberId: 'member-uuid-1',
  authorizationId: null,
  authorizationServiceId: null,
  appointmentDate: new Date('2026-03-15T10:00:00.000Z'),
  location: 'Hospital San Ignacio',
  doctorName: 'Dr. Mejía',
  specialty: 'Neumología',
  status: 'scheduled' as const,
  notes: null,
  familyMember: {
    id: 'member-uuid-1',
    fullName: 'Test Member',
    userId: 'user-uuid-1',
  },
  authorization: null,
  authorizationService: null,
  ...overrides,
});

/**
 * Creates a mock notification object
 * @param overrides Additional or overridden notification properties
 */
export const createMockNotification = (overrides: any = {}) => ({
  id: 'notif-123',
  userId: 'user-123',
  title: 'Test Notification',
  message: 'Test message',
  type: 'expiration_warning' as const,
  deliveryMethod: 'email' as const,
  relatedEntityType: 'authorization',
  relatedEntityId: 'auth-456',
  emailSent: false,
  emailError: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Creates a mock EmailService with notification methods
 * @param overrides Additional or overridden mock methods
 */
export const createMockEmailService = (overrides: any = {}) => ({
  sendAuthorizationExpirationReminder: jest.fn(),
  sendAppointmentReminder: jest.fn(),
  sendOcrCompletionNotification: jest.fn(),
  ...overrides,
});
