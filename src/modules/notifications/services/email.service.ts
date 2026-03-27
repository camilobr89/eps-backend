import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(
      process.env.RESEND_API_KEY || 're_He7K5qUc_H6PpjXxzTKGPrZ3Q2SErrqnF',
    );
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
      const subject = `Recordatorio: Autorización por vencer en ${data.daysRemaining} día(s)`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .alert { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px; }
            .info-item { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔔 Recordatorio de Autorización</h1>
            <p>Gestión EPS - Sistema de Seguimiento Médico</p>
          </div>
          
          <div class="content">
            <p>Hola ${data.recipientName},</p>
            
            <div class="alert">
              <strong>⚠️ IMPORTANTE:</strong> La autorización médica de <strong>${data.familyMemberName}</strong> está por vencer.
            </div>
            
            <h2>📋 Detalles de la Autorización:</h2>
            
            <div class="info-item">
              <strong>📄 Número de Autorización:</strong> ${data.authorizationNumber || 'N/A'}
            </div>
            
            <div class="info-item">
              <strong>👤 Paciente:</strong> ${data.familyMemberName}
            </div>
            
            <div class="info-item">
              <strong>🏥 EPS:</strong> ${data.epsName}
            </div>
            
            <div class="info-item">
              <strong>📅 Fecha de Vencimiento:</strong> ${data.expirationDate}
            </div>
            
            <div class="info-item">
              <strong>⏳ Días Restantes:</strong> ${data.daysRemaining} día(s)
            </div>
            
            <p style="margin-top: 30px;">
              <strong>📝 Acción Requerida:</strong> Por favor agenda una cita antes de la fecha de vencimiento para evitar inconvenientes.
            </p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/authorizations/${data.authorizationId}" class="button">
                👉 Ver Autorización en el Sistema
              </a>
            </p>
            
            <div class="footer">
              <p>Este es un mensaje automático del Sistema de Gestión EPS.</p>
              <p>Si tienes dudas, por favor contacta al administrador del sistema.</p>
              <p>© ${new Date().getFullYear()} Gestión EPS - Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: 'EPS Notificaciones <onboarding@resend.dev>',
        to,
        subject,
        html,
      });

      this.logger.log(
        `Email sent to ${to} for authorization ${data.authorizationId}`,
      );
      this.logger.debug(`Resend response: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
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
      const subject = `Recordatorio: Cita médica el ${data.appointmentDate}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .reminder { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px; }
            .info-item { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📅 Recordatorio de Cita</h1>
            <p>Gestión EPS - Sistema de Seguimiento Médico</p>
          </div>
          
          <div class="content">
            <p>Hola ${data.recipientName},</p>
            
            <div class="reminder">
              <strong>✅ CONFIRMACIÓN:</strong> Tienes una cita médica programada.
            </div>
            
            <h2>📋 Detalles de la Cita:</h2>
            
            <div class="info-item">
              <strong>👤 Paciente:</strong> ${data.familyMemberName}
            </div>
            
            <div class="info-item">
              <strong>📅 Fecha:</strong> ${data.appointmentDate}
            </div>
            
            <div class="info-item">
              <strong>🕒 Hora:</strong> ${data.appointmentTime}
            </div>
            
            <div class="info-item">
              <strong>📍 Lugar:</strong> ${data.location || 'Por confirmar'}
            </div>
            
            <div class="info-item">
              <strong>👨‍⚕️ Doctor:</strong> ${data.doctorName || 'Por asignar'}
            </div>
            
            <div class="info-item">
              <strong>🏥 Especialidad:</strong> ${data.specialty || 'General'}
            </div>
            
            <p style="margin-top: 30px;">
              <strong>💡 Recomendaciones:</strong>
            </p>
            <ul>
              <li>Llegar con 15 minutos de anticipación</li>
              <li>Llevar documento de identidad y carnet de la EPS</li>
              <li>Tener a mano la autorización correspondiente</li>
              <li>Informar cualquier cambio en el estado de salud</li>
            </ul>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/appointments/${data.appointmentId}" class="button">
                👉 Ver Cita en el Sistema
              </a>
            </p>
            
            <div class="footer">
              <p>Este es un mensaje automático del Sistema de Gestión EPS.</p>
              <p>Si necesitas cancelar o reagendar, por favor hazlo con anticipación.</p>
              <p>© ${new Date().getFullYear()} Gestión EPS - Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: 'EPS Notificaciones <onboarding@resend.dev>',
        to,
        subject,
        html,
      });

      this.logger.log(
        `Appointment reminder email sent to ${to} for appointment ${data.appointmentId}`,
      );
      this.logger.debug(`Resend response: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send appointment email to ${to}:`, error);
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
      const subject = `Procesamiento completado: ${data.fileName}`;

      const confidenceColor =
        data.confidenceScore >= 0.8
          ? '#4CAF50'
          : data.confidenceScore >= 0.6
            ? '#FFC107'
            : '#F44336';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 15px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0; }
            .button { display: inline-block; background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px; }
            .info-item { margin: 10px 0; }
            .confidence { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; color: white; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📄 Documento Procesado</h1>
            <p>Gestión EPS - Sistema de OCR Automático</p>
          </div>
          
          <div class="content">
            <p>Hola ${data.recipientName},</p>
            
            ${
              data.confidenceScore >= 0.8
                ? `<div class="success">
                <strong>✅ ÉXITO:</strong> El documento ha sido procesado exitosamente con alta confianza.
              </div>`
                : `<div class="warning">
                <strong>⚠️ REVISIÓN RECOMENDADA:</strong> El documento fue procesado pero requiere verificación manual.
              </div>`
            }
            
            <h2>📋 Resultados del Procesamiento:</h2>
            
            <div class="info-item">
              <strong>📄 Archivo:</strong> ${data.fileName}
            </div>
            
            <div class="info-item">
              <strong>👤 Paciente:</strong> ${data.familyMemberName}
            </div>
            
            <div class="info-item">
              <strong>📊 Número de Autorización:</strong> ${data.authorizationNumber || 'N/A'}
            </div>
            
            <div class="info-item">
              <strong>🎯 Confianza del OCR:</strong> 
              <span class="confidence" style="background: ${confidenceColor}">
                ${(data.confidenceScore * 100).toFixed(1)}%
              </span>
            </div>
            
            <p style="margin-top: 30px;">
              ${
                data.confidenceScore >= 0.8
                  ? 'Los datos han sido extraídos automáticamente y están listos para usar.'
                  : 'Por favor revisa y verifica los datos extraídos, ya que la confianza es moderada.'
              }
            </p>
            
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/documents/${data.documentId}" class="button">
                👉 Revisar Documento
              </a>
            </p>
            
            <div class="footer">
              <p>Este es un mensaje automático del Sistema de Gestión EPS.</p>
              <p>El procesamiento OCR ayuda a extraer información automáticamente de tus documentos médicos.</p>
              <p>© ${new Date().getFullYear()} Gestión EPS - Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await this.resend.emails.send({
        from: 'EPS Notificaciones <onboarding@resend.dev>',
        to,
        subject,
        html,
      });

      this.logger.log(
        `OCR completion email sent to ${to} for document ${data.documentId}`,
      );
      this.logger.debug(`Resend response: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OCR email to ${to}:`, error);
      return false;
    }
  }
}
