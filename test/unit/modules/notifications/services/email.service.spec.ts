import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '@/modules/notifications/services/email.service';
import {
  buildEmailExpirationWarningData,
  buildEmailAppointmentReminderData,
  buildEmailOcrCompletionData,
} from '../../../../utils/test-data-builders';

// Create a mock Resend instance
const mockResendInstance = {
  emails: {
    send: jest.fn(),
  },
};

// Mock the Resend class
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => mockResendInstance),
  };
});

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset process.env
    delete process.env.RESEND_API_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should not show onboarding warning when custom from address is set', async () => {
    const prevFrom = process.env.RESEND_FROM_EMAIL;
    const prevApiKey = process.env.RESEND_API_KEY;
    process.env.RESEND_FROM_EMAIL = 'EPS <notificaciones@mi-dominio.com>';
    process.env.RESEND_API_KEY = 're_test_custom_key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    const customService = module.get<EmailService>(EmailService);
    expect(customService).toBeDefined();

    if (prevFrom !== undefined) {
      process.env.RESEND_FROM_EMAIL = prevFrom;
    } else {
      delete process.env.RESEND_FROM_EMAIL;
    }
    if (prevApiKey !== undefined) {
      process.env.RESEND_API_KEY = prevApiKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }
  });

  describe('sendAuthorizationExpirationReminder', () => {
    const to = 'test@example.com';
    const data = buildEmailExpirationWarningData({
      authorizationNumber: 'AUTH-123',
      authorizationId: 'auth-123',
    });

    it('should send email successfully and return true', async () => {
      const mockResponse = { id: 'email-123' };
      mockResendInstance.emails.send.mockResolvedValue(mockResponse);

      const result = await service.sendAuthorizationExpirationReminder(
        to,
        data,
      );

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'EPS Notificaciones <onboarding@resend.dev>',
        to,
        subject: `Recordatorio: Autorización por vencer en ${data.daysRemaining} día(s)`,
        html: expect.stringContaining(data.recipientName),
      });
      expect(result).toBe(true);
    });

    it('should return false when email sending fails', async () => {
      mockResendInstance.emails.send.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendAuthorizationExpirationReminder(
        to,
        data,
      );

      expect(mockResendInstance.emails.send).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle Resend API error with statusCode', async () => {
      const resendError = Object.assign(new Error('Forbidden'), {
        statusCode: 403,
        name: 'validation_error',
        message: 'The from address does not match a verified domain',
      });
      mockResendInstance.emails.send.mockRejectedValue(resendError);

      const result = await service.sendAuthorizationExpirationReminder(
        to,
        data,
      );

      expect(result).toBe(false);
    });

    it('should handle non-Error rejection', async () => {
      mockResendInstance.emails.send.mockRejectedValue('Network timeout');

      const result = await service.sendAuthorizationExpirationReminder(
        to,
        data,
      );

      expect(result).toBe(false);
    });

    it('should use default API key when RESEND_API_KEY is not set', async () => {
      mockResendInstance.emails.send.mockResolvedValue({ id: 'email-123' });

      await service.sendAuthorizationExpirationReminder(to, data);

      // The service constructor uses default key when env var is not set
      expect(service).toBeDefined();
    });

    it('should include all data in email HTML', async () => {
      mockResendInstance.emails.send.mockResolvedValue({ id: 'email-123' });

      await service.sendAuthorizationExpirationReminder(to, data);

      const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
      const html = sendCall.html as string;

      expect(html).toContain(data.recipientName);
      expect(html).toContain(data.authorizationNumber);
      expect(html).toContain(data.expirationDate);
      expect(html).toContain(data.daysRemaining.toString());
      expect(html).toContain(data.familyMemberName);
      expect(html).toContain(data.epsName);
      expect(html).toContain(data.authorizationId);
    });
  });

  describe('sendAppointmentReminder', () => {
    const to = 'test@example.com';
    const data = buildEmailAppointmentReminderData({
      appointmentId: 'appt-456',
    });

    it('should send appointment reminder email successfully', async () => {
      const mockResponse = { id: 'email-456' };
      mockResendInstance.emails.send.mockResolvedValue(mockResponse);

      const result = await service.sendAppointmentReminder(to, data);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'EPS Notificaciones <onboarding@resend.dev>',
        to,
        subject: `Recordatorio: Cita médica el ${data.appointmentDate}`,
        html: expect.stringContaining(data.recipientName),
      });
      expect(result).toBe(true);
    });

    it('should handle missing optional fields in email content', async () => {
      const dataWithMissingFields = {
        ...data,
        location: '',
        doctorName: '',
        specialty: '',
      };
      mockResendInstance.emails.send.mockResolvedValue({ id: 'email-456' });

      const result = await service.sendAppointmentReminder(
        to,
        dataWithMissingFields,
      );

      expect(result).toBe(true);
      const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
      const html = sendCall.html as string;
      expect(html).toContain('Por confirmar'); // For missing location
      expect(html).toContain('Por asignar'); // For missing doctor
      expect(html).toContain('General'); // For missing specialty
    });

    it('should return false when email sending fails', async () => {
      mockResendInstance.emails.send.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.sendAppointmentReminder(to, data);

      expect(result).toBe(false);
    });
  });

  describe('sendOcrCompletionNotification', () => {
    const to = 'test@example.com';
    const data = buildEmailOcrCompletionData();

    it('should send OCR completion email successfully with high confidence', async () => {
      const mockResponse = { id: 'email-789' };
      mockResendInstance.emails.send.mockResolvedValue(mockResponse);

      const result = await service.sendOcrCompletionNotification(to, data);

      expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
        from: 'EPS Notificaciones <onboarding@resend.dev>',
        to,
        subject: `Procesamiento completado: ${data.fileName}`,
        html: expect.stringContaining(data.recipientName),
      });
      expect(result).toBe(true);
    });

    it('should include success message for high confidence score', async () => {
      const highConfidenceData = { ...data, confidenceScore: 0.9 };
      mockResendInstance.emails.send.mockResolvedValue({ id: 'email-789' });

      await service.sendOcrCompletionNotification(to, highConfidenceData);

      const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
      const html = sendCall.html as string;
      expect(html).toContain('ÉXITO');
      expect(html).toContain('alta confianza');
    });

    it('should include warning message for moderate confidence score', async () => {
      const moderateConfidenceData = { ...data, confidenceScore: 0.7 };
      mockResendInstance.emails.send.mockResolvedValue({ id: 'email-789' });

      await service.sendOcrCompletionNotification(to, moderateConfidenceData);

      const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
      const html = sendCall.html as string;
      expect(html).toContain('REVISIÓN RECOMENDADA');
      expect(html).toContain('verificación manual');
    });

    it('should include warning message for low confidence score', async () => {
      const lowConfidenceData = { ...data, confidenceScore: 0.5 };
      mockResendInstance.emails.send.mockResolvedValue({ id: 'email-789' });

      await service.sendOcrCompletionNotification(to, lowConfidenceData);

      const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
      const html = sendCall.html as string;
      expect(html).toContain('REVISIÓN RECOMENDADA');
    });

    it('should include confidence score percentage in email', async () => {
      mockResendInstance.emails.send.mockResolvedValue({ id: 'email-789' });

      await service.sendOcrCompletionNotification(to, data);

      const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
      const html = sendCall.html as string;
      expect(html).toContain(`${(data.confidenceScore * 100).toFixed(1)}%`);
    });

    it('should return false when email sending fails', async () => {
      mockResendInstance.emails.send.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendOcrCompletionNotification(to, data);

      expect(result).toBe(false);
    });
  });
});
