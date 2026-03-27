import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private client: twilio.Twilio;
  private readonly sandboxNumber = 'whatsapp:+14155238886'; // Twilio Sandbox number
  private readonly sandboxPhrase =
    process.env.TWILIO_SANDBOX_PHRASE || 'join base-alter';

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    } else {
      this.logger.warn(
        'Twilio credentials not found. WhatsApp notifications will be simulated.',
      );
    }
  }

  onModuleInit() {
    if (this.client) {
      this.logger.log('WhatsApp service initialized with Twilio');
    } else {
      this.logger.warn(
        'WhatsApp service running in simulation mode (no real messages sent)',
      );
    }
  }

  async sendAuthorizationExpirationReminder(
    to: string,
    data: {
      recipientName: string;
      authorizationNumber: string;
      expirationDate: string;
      daysRemaining: number;
      familyMemberName: string;
      epsName: string;
      authorizationId: string;
    },
  ): Promise<boolean> {
    try {
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const message =
        `*🔔 Recordatorio de Autorización - Gestión EPS*\n\n` +
        `Hola ${data.recipientName},\n\n` +
        `⚠️ *IMPORTANTE:* La autorización médica de *${data.familyMemberName}* está por vencer.\n\n` +
        `*📋 Detalles:*\n` +
        `• Paciente: ${data.familyMemberName}\n` +
        `• EPS: ${data.epsName}\n` +
        `• N° Autorización: ${data.authorizationNumber || 'N/A'}\n` +
        `• Fecha Vencimiento: ${data.expirationDate}\n` +
        `• Días Restantes: ${data.daysRemaining} día(s)\n\n` +
        `*📝 Acción Requerida:* Agenda una cita antes del vencimiento.\n\n` +
        `🔗 Ver autorización: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/authorizations/${data.authorizationId}\n\n` +
        `_Este es un mensaje automático. No responder._`;

      return await this.sendMessage(whatsappTo, message);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp authorization reminder to ${to}:`,
        error,
      );
      return false;
    }
  }

  async sendAppointmentReminder(
    to: string,
    data: {
      recipientName: string;
      appointmentDate: string;
      appointmentTime: string;
      location: string;
      doctorName: string;
      specialty: string;
      familyMemberName: string;
      appointmentId: string;
    },
  ): Promise<boolean> {
    try {
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const message =
        `*📅 Recordatorio de Cita - Gestión EPS*\n\n` +
        `Hola ${data.recipientName},\n\n` +
        `✅ *CONFIRMACIÓN:* Tienes una cita médica programada.\n\n` +
        `*📋 Detalles de la Cita:*\n` +
        `• Paciente: ${data.familyMemberName}\n` +
        `• Fecha: ${data.appointmentDate}\n` +
        `• Hora: ${data.appointmentTime}\n` +
        `• Lugar: ${data.location || 'Por confirmar'}\n` +
        `• Doctor: ${data.doctorName || 'Por asignar'}\n` +
        `• Especialidad: ${data.specialty || 'General'}\n\n` +
        `*💡 Recomendaciones:*\n` +
        `• Llegar con 15 minutos de anticipación\n` +
        `• Llevar documento y carnet de EPS\n` +
        `• Tener la autorización a mano\n` +
        `• Informar cambios de salud\n\n` +
        `🔗 Ver cita: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/appointments/${data.appointmentId}\n\n` +
        `_Este es un mensaje automático. No responder._`;

      return await this.sendMessage(whatsappTo, message);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp appointment reminder to ${to}:`,
        error,
      );
      return false;
    }
  }

  async sendOcrCompletionNotification(
    to: string,
    data: {
      recipientName: string;
      fileName: string;
      authorizationNumber: string;
      familyMemberName: string;
      confidenceScore: number;
      documentId: string;
    },
  ): Promise<boolean> {
    try {
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const confidenceEmoji =
        data.confidenceScore >= 0.8
          ? '✅'
          : data.confidenceScore >= 0.6
            ? '⚠️'
            : '❌';

      const message =
        `*📄 Documento Procesado - Gestión EPS*\n\n` +
        `Hola ${data.recipientName},\n\n` +
        `${confidenceEmoji} *PROCESAMIENTO COMPLETADO*\n\n` +
        `*📋 Resultados:*\n` +
        `• Archivo: ${data.fileName}\n` +
        `• Paciente: ${data.familyMemberName}\n` +
        `• N° Autorización: ${data.authorizationNumber || 'N/A'}\n` +
        `• Confianza OCR: ${(data.confidenceScore * 100).toFixed(1)}%\n\n` +
        `${
          data.confidenceScore >= 0.8
            ? 'Los datos han sido extraídos automáticamente y están listos para usar.'
            : 'Por favor revisa y verifica los datos extraídos, ya que la confianza es moderada.'
        }\n\n` +
        `🔗 Revisar documento: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/documents/${data.documentId}\n\n` +
        `_Este es un mensaje automático. No responder._`;

      return await this.sendMessage(whatsappTo, message);
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp OCR notification to ${to}:`,
        error,
      );
      return false;
    }
  }

  private async sendMessage(to: string, body: string): Promise<boolean> {
    try {
      if (!this.client) {
        // Simulation mode - log the message instead of sending
        this.logger.log(
          `[SIMULATION] WhatsApp message to ${to}: ${body.substring(0, 100)}...`,
        );
        return true;
      }

      const message = await this.client.messages.create({
        from: this.sandboxNumber,
        to,
        body,
      });

      this.logger.log(`WhatsApp message sent to ${to}, SID: ${message.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Twilio API error sending to ${to}:`, error);
      return false;
    }
  }

  validateNumber(phoneNumber: string): boolean {
    if (!phoneNumber) return false;

    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber)) {
      this.logger.warn(
        `Invalid phone number format: ${phoneNumber}. Expected E.164 format (e.g., +573001234567)`,
      );
      return false;
    }

    // Check if it's likely a WhatsApp-enabled number (basic check for Colombia)
    if (phoneNumber.startsWith('+57')) {
      // Colombian numbers should be 10 digits after +57
      const digits = phoneNumber.substring(3);
      return digits.length === 10 && /^[0-9]+$/.test(digits);
    }

    // For other countries, just validate format
    return true;
  }

  getSandboxInstructions(): string {
    return (
      `Para recibir notificaciones por WhatsApp:\n\n` +
      `1. Guarda este número en tus contactos: ${this.sandboxNumber}\n` +
      `2. Envía el mensaje "${this.sandboxPhrase}" a este número\n` +
      `3. Espera la confirmación de Twilio\n` +
      `4. ¡Listo! Recibirás notificaciones automáticas.\n\n` +
      `*Nota:* Este es el entorno sandbox de Twilio. Para producción necesitarás aprobación de Meta.`
    );
  }
}
