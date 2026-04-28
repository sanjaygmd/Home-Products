import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred SMTP service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends a password reset confirmation email to an administrator.
 * 
 * @param {string} email - Recipient email
 * @param {string} name - Administrator name
 * @param {string} newPassword - The new temporary password
 */
export const sendAdminPasswordResetEmail = async (email, name, newPassword) => {
  const mailOptions = {
    from: `"Home Products Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Administrative Password Reset - Action Required',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #2563eb; margin: 0;">GMD Home Products</h2>
          <p style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Administrative Portal</p>
        </div>
        
        <div style="padding: 20px; background-color: #f8fafc; border-radius: 12px; margin-bottom: 30px;">
          <p style="font-size: 16px; color: #0f172a;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">
            A password reset was requested for your administrative account. 
            Please use the 6-digit verification code below to set a new password:
          </p>
          
          <div style="margin: 25px 0; padding: 15px; background-color: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Verification Code</p>
            <p style="margin: 10px 0 0 0; font-size: 32px; color: #2563eb; font-family: monospace; font-weight: bold; letter-spacing: 4px;">${newPassword}</p>
          </div>
          
          <p style="font-size: 13px; color: #ef4444; font-weight: bold;">
            ⚠️ Important: This code will expire in 15 minutes.
          </p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.CLIENT_URL}/admin/login" style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Log In to Admin Portal</a>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            This is an automated security notification. If you did not request this, please contact the Super Admin immediately.
          </p>
          <p style="font-size: 11px; color: #cbd5e1; margin-top: 5px;">&copy; 2026 GMD Home Products Marketplace</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("[MAILER] Error sending email:", error);
    return { success: false, error };
  }
};

/**
 * Sends a 2FA OTP email for Super Admin login.
 * 
 * @param {string} email - Recipient email
 * @param {string} name - Administrator name
 * @param {string} otp - The 6-digit OTP
 */
export const sendSuperAdminLoginOTP = async (email, name, otp) => {
  const mailOptions = {
    from: `"Home Products Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Super Admin Login - 2FA Verification Code',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #6366f1; margin: 0;">GMD Home Products</h2>
          <p style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Super Admin Secure Portal</p>
        </div>
        
        <div style="padding: 20px; background-color: #f8fafc; border-radius: 12px; margin-bottom: 30px;">
          <p style="font-size: 16px; color: #0f172a;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">
            We detected a login attempt to your Super Admin account.
            Please use the 6-digit verification code below to complete your login:
          </p>
          
          <div style="margin: 25px 0; padding: 15px; background-color: #ffffff; border: 1.5px dashed #6366f1; border-radius: 8px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">2FA Verification Code</p>
            <p style="margin: 10px 0 0 0; font-size: 32px; color: #6366f1; font-family: monospace; font-weight: bold; letter-spacing: 4px;">${otp}</p>
          </div>
          
          <p style="font-size: 13px; color: #ef4444; font-weight: bold;">
            ⚠️ Important: This code will expire in 5 minutes. Do not share it with anyone.
          </p>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            If you did not attempt to log in, please secure your account immediately.
          </p>
          <p style="font-size: 11px; color: #cbd5e1; margin-top: 5px;">&copy; 2026 GMD Home Products Marketplace</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Super Admin 2FA email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("[MAILER] Error sending 2FA email:", error);
    return { success: false, error };
  }
};
