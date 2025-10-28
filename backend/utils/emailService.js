import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter using Gmail (you can use other email services)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASSWORD // Your Gmail App Password
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

// Generate 6-digit verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
export const sendVerificationEmail = async (email, name, code) => {
  const mailOptions = {
    from: `"MuscleHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'MuscleHub - Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #00ff00; margin: 0;">MuscleHub</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Thank you for signing in to MuscleHub. To complete your login, please use the verification code below:
          </p>
          
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h1 style="color: #00ff00; font-size: 36px; letter-spacing: 8px; margin: 0;">
              ${code}
            </h1>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            This code will expire in <strong>10 minutes</strong>.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request this code, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2025 MuscleHub. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, name, code) => {
  const mailOptions = {
    from: `"MuscleHub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'MuscleHub - Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #00ff00; margin: 0;">MuscleHub</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            We received a request to reset your password. Use the code below to create a new password:
          </p>
          
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h1 style="color: #00ff00; font-size: 36px; letter-spacing: 8px; margin: 0;">
              ${code}
            </h1>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            This code will expire in <strong>15 minutes</strong>.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>© 2025 MuscleHub. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Verify the email service is working
export const verifyEmailService = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
};
