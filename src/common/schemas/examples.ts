/**
 * Common example objects for API responses
 */

export const ExampleSchemas = {
  /**
   * Common UUID example
   */
  uuid: '123e4567-e89b-12d3-a456-426614174000',

  /**
   * Secondary UUID example (for lists with multiple items)
   */
  uuid2: '223e4567-e89b-12d3-a456-426614174000',

  /**
   * Common timestamp example
   */
  timestamp: '2024-01-15T10:00:00.000Z',

  /**
   * Common appointment example
   */
  appointment: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
    authorizationId: '123e4567-e89b-12d3-a456-426614174000',
    authorizationServiceId: '123e4567-e89b-12d3-a456-426614174000',
    appointmentDate: '2024-12-31T14:30:00.000Z',
    location: 'Hospital Central',
    doctorName: 'Dr. Juan Pérez',
    specialty: 'Cardiología',
    notes: 'Paciente requiere ayuno de 8 horas',
    status: 'scheduled',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  },

  /**
   * Simplified appointment example (without optional fields)
   */
  appointmentSimple: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
    appointmentDate: '2024-12-31T14:30:00.000Z',
    location: 'Hospital Central',
    doctorName: 'Dr. Juan Pérez',
    specialty: 'Cardiología',
    status: 'scheduled',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  },

  /**
   * Common family member example
   */
  familyMember: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fullName: 'Juan Pérez',
    documentType: 'CC',
    documentNumber: 'CC123456789',
    birthDate: '1990-01-15',
    address: 'Calle 123 #45-67',
    phone: '6012345678',
    cellphone: '3001234567',
    email: 'juan.perez@example.com',
    department: 'Antioquia',
    city: 'Medellín',
    regime: 'contributivo',
    relationship: 'Hijo',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    epsProviderId: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-15T10:30:00.000Z',
  },

  /**
   * Common authorization example
   */
  authorization: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    requestNumber: 'AUTH-2024-001',
    familyMemberId: '123e4567-e89b-12d3-a456-426614174001',
    epsProviderId: '123e4567-e89b-12d3-a456-426614174002',
    priority: 'medium',
    status: 'pending',
    expirationDate: '2024-12-31T23:59:59.000Z',
    services: [
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        serviceCode: 'CONSULTA',
        serviceName: 'Consulta médica general',
        serviceType: 'consultation',
        quantity: 1,
      },
    ],
  },

  /**
   * Common notification example
   */
  notification: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Notification title',
    message: 'Notification message',
    read: false,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },

  /**
   * Upcoming appointments list example
   */
  appointmentUpcomingList: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
      appointmentDate: '2024-12-31T14:30:00.000Z',
      location: 'Hospital Central',
      doctorName: 'Dr. Juan Pérez',
      specialty: 'Cardiología',
      status: 'scheduled',
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    },
  ],

  /**
   * Updated appointment example (after update operation)
   */
  appointmentUpdated: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
    authorizationId: '123e4567-e89b-12d3-a456-426614174000',
    authorizationServiceId: '123e4567-e89b-12d3-a456-426614174000',
    appointmentDate: '2024-12-31T14:30:00.000Z',
    location: 'Hospital Central',
    doctorName: 'Dr. Juan Pérez',
    specialty: 'Cardiología',
    notes: 'Paciente requiere ayuno de 8 horas',
    status: 'confirmed',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-16T14:30:00.000Z',
  },

  /**
   * Cancelled appointment example (after delete operation)
   */
  appointmentCancelled: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    familyMemberId: '123e4567-e89b-12d3-a456-426614174000',
    appointmentDate: '2024-12-31T14:30:00.000Z',
    location: 'Hospital Central',
    doctorName: 'Dr. Juan Pérez',
    specialty: 'Cardiología',
    status: 'cancelled',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-17T09:00:00.000Z',
  },

  /**
   * Updated family member example (after update operation)
   */
  familyMemberUpdated: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    fullName: 'Juan Pérez Actualizado',
    documentType: 'CC',
    documentNumber: 'CC123456789',
    birthDate: '1990-01-15',
    address: 'Calle 123 #45-67',
    phone: '6012345678',
    cellphone: '3001234567',
    email: 'juan.perez@example.com',
    department: 'Antioquia',
    city: 'Medellín',
    regime: 'contributivo',
    relationship: 'Hijo',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    epsProviderId: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: '2025-01-15T10:30:00.000Z',
    updatedAt: '2025-01-16T09:45:00.000Z',
  },

  /**
   * Family members list example
   */
  familyMemberList: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      fullName: 'Juan Pérez',
      documentType: 'CC',
      documentNumber: 'CC123456789',
      birthDate: '1990-01-15',
      address: 'Calle 123 #45-67',
      phone: '6012345678',
      cellphone: '3001234567',
      email: 'juan.perez@example.com',
      department: 'Antioquia',
      city: 'Medellín',
      regime: 'contributivo',
      relationship: 'Hijo',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      epsProviderId: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2025-01-15T10:30:00.000Z',
      updatedAt: '2025-01-15T10:30:00.000Z',
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174000',
      fullName: 'María García',
      documentType: 'CC',
      documentNumber: 'CC987654321',
      birthDate: '1985-05-20',
      address: 'Carrera 56 #78-90',
      phone: '6018765432',
      cellphone: '3109876543',
      email: 'maria.garcia@example.com',
      department: 'Cundinamarca',
      city: 'Bogotá',
      regime: 'subsidiado',
      relationship: 'Cónyuge',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      epsProviderId: '223e4567-e89b-12d3-a456-426614174000',
      createdAt: '2025-01-16T14:20:00.000Z',
      updatedAt: '2025-01-16T14:20:00.000Z',
    },
  ],
};
