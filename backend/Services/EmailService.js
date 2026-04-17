const pool = require('../config/db');

class EmailService {
  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@matchday.com';
  }

  /**
   * Send email using Resend API
   */
  async sendEmail(to, subject, html) {
    if (!this.resendApiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: to,
          subject: subject,
          html: html
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(userEmail, userName, bookingDetails) {
    const subject = 'Konfirmim Rezervimi - MATCHDAY';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Konfirmim Rezervimi</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d1f16 0%, #1a6b3c 100%); padding: 30px; text-align: center;">
          <h1 style="color: #c8ff00; margin: 0; font-size: 32px;">MATCHDAY</h1>
          <p style="color: #e8f5e9; margin: 10px 0 0 0;">Platforma e Rezervimit të Fushave të Futbollit</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #1a6b3c; margin-top: 0;">Përshëndetje, ${userName}!</h2>
          <p>Rezervimi juaj është konfirmuar me sukses. Ja detajet:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c8ff00;">
            <h3 style="color: #1a6b3c; margin-top: 0;">Detajet e Rezervimit</h3>
            <p><strong>Fusha:</strong> ${bookingDetails.field_name}</p>
            <p><strong>Data:</strong> ${new Date(bookingDetails.start_time).toLocaleDateString('sq-AL')}</p>
            <p><strong>Ora:</strong> ${new Date(bookingDetails.start_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })} - ${new Date(bookingDetails.end_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Çmimi për lojtar:</strong> €${bookingDetails.price_per_player}</p>
            <p><strong>Metoda e pagesës:</strong> ${bookingDetails.payment_method === 'cash' ? 'Cash' : 'Kartë'}</p>
          </div>
          
          <p><strong>Për të përfituar nga Smart Split:</strong></p>
          <ul style="color: #555;">
            <li>Çmimi total i fushës (€${bookingDetails.total_price}) është ndarë me 12 lojtarë</li>
            <li>Çdo lojtar paguan €${bookingDetails.price_per_player} për pjesën e fushës</li>
            <li>Pagesat duhen të bëhen brenda 2 orëve para fillimit të ndeshjes</li>
          </ul>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;"><strong>⚠️ Rregulli i Anulimit:</strong></p>
            <ul style="margin: 10px 0 0 20px; color: #856404;">
              <li>Anulim më shumë se 2 orë para fillimit: Rimbursim 100%</li>
              <li>Anulim më pak se 2 orë para fillimit: Penalitet 40% (rimbursim 60%)</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Nëse keni pyetje, na kontaktoni në support@matchday.com</p>
          <p>Faleminderit që përdorni MATCHDAY! 🏆</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send cancellation email
   */
  async sendCancellation(userEmail, userName, bookingDetails, refundAmount) {
    const subject = 'Anulim Rezervimi - MATCHDAY';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Anulim Rezervimi</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d1f16 0%, #1a6b3c 100%); padding: 30px; text-align: center;">
          <h1 style="color: #c8ff00; margin: 0; font-size: 32px;">MATCHDAY</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #e74c3c; margin-top: 0;">Rezervimi u Anulua</h2>
          <p>Përshëndetje, ${userName}!</p>
          <p>Rezervimi juaj për fushën <strong>${bookingDetails.field_name}</strong> është anuluar.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <p><strong>Data:</strong> ${new Date(bookingDetails.start_time).toLocaleDateString('sq-AL')}</p>
            <p><strong>Ora:</strong> ${new Date(bookingDetails.start_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Shkaku i anulimit:</strong> ${bookingDetails.cancellation_reason || 'Kërkesë e përdoruesit'}</p>
          </div>
          
          ${refundAmount > 0 ? `
          <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0; color: #155724;"><strong>✓ Rimbursim:</strong> €${refundAmount.toFixed(2)}</p>
            <p style="margin: 5px 0 0 0; color: #155724;">Rimbursimi do të transferohet në llogarinë tuaj bankare brenda 3-5 ditëve pune.</p>
          </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Faleminderit që përdorni MATCHDAY! 🏆</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send invitation email
   */
  async sendInvitation(userEmail, userName, invitationDetails) {
    const subject = 'Ftesë për Ndeshje - MATCHDAY';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ftesë për Ndeshje</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d1f16 0%, #1a6b3c 100%); padding: 30px; text-align: center;">
          <h1 style="color: #c8ff00; margin: 0; font-size: 32px;">MATCHDAY</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #1a6b3c; margin-top: 0;">Jeni ftuar të luani! ⚽</h2>
          <p>Përshëndetje, ${userName}!</p>
          <p><strong>${invitationDetails.organizer_name}</strong> ju ka ftuar të luani në një ndeshje.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c8ff00;">
            <p><strong>Fusha:</strong> ${invitationDetails.field_name}</p>
            <p><strong>Data:</strong> ${new Date(invitationDetails.start_time).toLocaleDateString('sq-AL')}</p>
            <p><strong>Ora:</strong> ${new Date(invitationDetails.start_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })} - ${new Date(invitationDetails.end_time).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Çmimi për lojtar:</strong> €${invitationDetails.price_per_player}</p>
            <p><strong>Lojtarët aktualë:</strong> ${invitationDetails.current_players}/12</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.VITE_API_URL || 'http://localhost:5173'}/invitations" style="background: #c8ff00; color: #0d1f16; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Shiko Ftesat
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Përgjigjuni ftesës brenda kohës për të siguruar vendin tuaj!</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Faleminderit që përdorni MATCHDAY! 🏆</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(userEmail, userName, paymentDetails) {
    const subject = 'Konfirmim Pagesës - MATCHDAY';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Konfirmim Pagesës</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0d1f16 0%, #1a6b3c 100%); padding: 30px; text-align: center;">
          <h1 style="color: #c8ff00; margin: 0; font-size: 32px;">MATCHDAY</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #28a745; margin-top: 0;">Pagesa u Konfirmua ✓</h2>
          <p>Përshëndetje, ${userName}!</p>
          <p>Pagesa juaj është konfirmuar me sukses.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p><strong>Shuma:</strong> €${paymentDetails.amount.toFixed(2)}</p>
            <p><strong>Metoda:</strong> ${paymentDetails.payment_method === 'cash' ? 'Cash' : 'Kartë'}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('sq-AL')}</p>
            <p><strong>Referenca:</strong> ${paymentDetails.transaction_reference || 'N/A'}</p>
          </div>
          
          <p style="color: #666; font-size: 14px;">Gati për ndeshjen! Pritni informacion shtesë për kohën dhe vendin.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Faleminderit që përdorni MATCHDAY! 🏆</p>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Process pending notifications from database
   */
  async processPendingNotifications() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get pending notifications with user email
      const result = await client.query(`
        SELECT n.id, n.user_id, n.booking_id, n.type, n.subject, n.body, u.email, u.name
        FROM Notifications n
        JOIN Users u ON n.user_id = u.id
        WHERE n.is_sent = FALSE
        ORDER BY n.created_at ASC
        LIMIT 50
      `);
      
      const processed = [];
      
      for (const notification of result.rows) {
        let emailResult;
        
        switch (notification.type) {
          case 'confirmation':
            emailResult = await this.sendBookingConfirmation(
              notification.email,
              notification.name,
              JSON.parse(notification.body)
            );
            break;
          case 'cancellation':
            emailResult = await this.sendCancellation(
              notification.email,
              notification.name,
              JSON.parse(notification.body)
            );
            break;
          case 'invitation':
            emailResult = await this.sendInvitation(
              notification.email,
              notification.name,
              JSON.parse(notification.body)
            );
            break;
          case 'refund':
            emailResult = await this.sendPaymentConfirmation(
              notification.email,
              notification.name,
              JSON.parse(notification.body)
            );
            break;
          default:
            emailResult = await this.sendEmail(notification.email, notification.subject, notification.body);
        }
        
        if (emailResult.success) {
          await client.query(
            'UPDATE Notifications SET is_sent = TRUE, sent_at = CURRENT_TIMESTAMP WHERE id = $1',
            [notification.id]
          );
          processed.push(notification.id);
        }
      }
      
      await client.query('COMMIT');
      
      return {
        processed_count: processed.length,
        notification_ids: processed
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Process notifications error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = EmailService;
