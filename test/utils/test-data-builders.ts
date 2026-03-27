/**
 * Test data builders for consistent test data creation
 */

/**
 * Builds appointment creation DTO
 */
export const buildAppointmentCreateDto = (overrides: any = {}) => ({
  familyMemberId: 'member-uuid-1',
  appointmentDate: '2026-03-15T10:00:00.000Z',
  location: 'Hospital San Ignacio',
  doctorName: 'Dr. Mejía',
  specialty: 'Neumología',
  ...overrides,
});

/**
 * Builds family member creation DTO
 */
export const buildFamilyMemberCreateDto = (overrides: any = {}) => ({
  epsProviderId: 'eps-uuid-1',
  fullName: 'John Doe',
  documentType: 'CC' as const,
  documentNumber: '123456789',
  birthDate: '1990-01-15',
  address: 'Calle 123',
  phone: '1234567',
  cellphone: '3001234567',
  email: 'john@example.com',
  department: 'Antioquia',
  city: 'Medellín',
  regime: 'Contributivo',
  relationship: 'Hijo' as const,
  ...overrides,
});

/**
 * Builds appointment update DTO
 */
export const buildAppointmentUpdateDto = (overrides: any = {}) => ({
  notes: 'Updated notes',
  status: 'confirmed' as const,
  ...overrides,
});

/**
 * Builds family member update DTO
 */
export const buildFamilyMemberUpdateDto = (overrides: any = {}) => ({
  fullName: 'Jane Doe',
  city: 'Bogotá',
  ...overrides,
});

/**
 * Builds notification data for expiration warning
 */
export const buildExpirationWarningData = (overrides: any = {}) => ({
  title: 'Authorization Expiring',
  message: 'Your authorization is expiring soon',
  relatedEntityType: 'authorization',
  relatedEntityId: 'auth-456',
  authorizationNumber: 'AUTH-789',
  expirationDate: '2024-12-31',
  daysRemaining: 7,
  familyMemberName: 'Jane Doe',
  epsName: 'Salud Total',
  ...overrides,
});

/**
 * Builds appointment reminder notification data
 */
export const buildAppointmentReminderData = (overrides: any = {}) => ({
  title: 'Appointment Reminder',
  message: 'You have an appointment tomorrow',
  relatedEntityType: 'appointment',
  relatedEntityId: 'appt-123',
  appointmentDate: '2024-12-25',
  appointmentTime: '10:00 AM',
  location: 'Hospital Central',
  doctorName: 'Dr. Smith',
  specialty: 'Cardiology',
  familyMemberName: 'Jane Doe',
  ...overrides,
});

/**
 * Builds email expiration warning data for EmailService
 */
export const buildEmailExpirationWarningData = (overrides: any = {}) => ({
  recipientName: 'John Doe',
  authorizationNumber: 'AUTH-789',
  expirationDate: '2024-12-31',
  daysRemaining: 7,
  familyMemberName: 'Jane Doe',
  epsName: 'Salud Total',
  authorizationId: 'auth-456',
  ...overrides,
});

/**
 * Builds email appointment reminder data for EmailService
 */
export const buildEmailAppointmentReminderData = (overrides: any = {}) => ({
  recipientName: 'John Doe',
  appointmentDate: '2024-12-25',
  appointmentTime: '10:00 AM',
  location: 'Hospital Central',
  doctorName: 'Dr. Smith',
  specialty: 'Cardiology',
  familyMemberName: 'Jane Doe',
  appointmentId: 'appt-456',
  ...overrides,
});

/**
 * Builds email OCR completion data for EmailService
 */
export const buildEmailOcrCompletionData = (overrides: any = {}) => ({
  recipientName: 'John Doe',
  fileName: 'document.pdf',
  authorizationNumber: 'AUTH-789',
  familyMemberName: 'Jane Doe',
  confidenceScore: 0.85,
  documentId: 'doc-123',
  ...overrides,
});

/**
 * Builds OCR completion notification data for NotificationDeliveryService
 */
export const buildOcrCompletionData = (overrides: any = {}) => ({
  title: 'OCR Processing Complete',
  message: 'Your document has been processed',
  relatedEntityType: 'document',
  relatedEntityId: 'doc-123',
  fileName: 'document.pdf',
  authorizationNumber: 'AUTH-456',
  familyMemberName: 'Jane Doe',
  confidenceScore: 0.85,
  documentId: 'doc-123',
  ...overrides,
});

/**
 * Builds common test constants
 */
export const TEST_CONSTANTS = {
  USER_ID: 'user-uuid-1',
  MEMBER_ID: 'member-uuid-1',
  APPOINTMENT_ID: 'appt-uuid-1',
  AUTHORIZATION_ID: 'auth-uuid-1',
  NOTIFICATION_ID: 'notif-123',
  EPS_PROVIDER_ID: 'eps-uuid-1',
  DOCUMENT_ID: 'doc-uuid-1',
};
