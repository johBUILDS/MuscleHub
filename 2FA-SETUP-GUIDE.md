# Two-Factor Authentication Setup Guide

## 🔐 2FA Implementation Complete!

The two-factor authentication system is now ready. Users will receive a 6-digit verification code via email when logging in.

## 📧 Email Configuration Required

To enable email sending, you need to configure a Gmail account:

### Step 1: Get Gmail App Password

1. **Go to your Gmail account** (the one you want to use for sending verification emails)
2. **Enable 2-Step Verification**:
   - Go to: https://myaccount.google.com/security
   - Find "2-Step Verification" and turn it ON
3. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device, name it "MuscleHub"
   - Click "Generate"
   - Copy the 16-character password (example: `abcd efgh ijkl mnop`)

### Step 2: Update .env File

Edit `backend/.env` and add your email credentials:

```
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

**Example:**

```
EMAIL_USER=musclehub.gym@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

⚠️ **Important**: Use the App Password, NOT your regular Gmail password!

### Step 3: Restart Backend Server

After updating the .env file, restart your backend server:

```bash
cd backend
npm start
```

## 🎯 How It Works

### For Users:

1. User enters email and password on login page
2. If credentials are correct, a verification code is sent to their email
3. User receives email with 6-digit code (valid for 10 minutes)
4. User enters the code on verification screen
5. Upon successful verification, user is logged in

### For Developers:

- **Login endpoint**: `/api/auth/login` - Validates credentials, sends verification code
- **Verify endpoint**: `/api/auth/verify-code` - Validates code, completes login
- **Email service**: `backend/utils/emailService.js` - Handles email sending
- **User model**: Updated with `verificationCode`, `verificationCodeExpires`, `isVerified` fields

## 🔄 Testing 2FA

### Test Flow:

1. Make sure MongoDB is running
2. Start backend: `cd backend && npm start`
3. Start frontend: `cd MuscleHubV2 && npm start`
4. Try logging in with any existing account
5. Check email for verification code
6. Enter code on verification screen

### Test Accounts:

- Admin: `admin@musclehub.com` / `admin123`
- Member: Any registered member account

## 🛠️ Troubleshooting

### Email not sending?

- ✅ Check EMAIL_USER and EMAIL_PASSWORD in .env
- ✅ Verify you're using App Password, not regular password
- ✅ Confirm 2-Step Verification is enabled on Gmail
- ✅ Check backend console for email errors
- ✅ Look in spam/junk folder for verification emails

### Code expired?

- Codes are valid for 10 minutes
- User must log in again to get a new code

### Wrong code error?

- Code is case-sensitive (all digits)
- Make sure user is entering the exact 6-digit code from email

## 📋 Password Requirements (Updated)

When signing up, passwords must:

- ✅ Be 8-12 characters long
- ✅ Contain only letters and numbers (no special characters)
- ✅ Match the confirmation password

## 🎨 Features Added

### Backend:

- ✅ Email service with Nodemailer
- ✅ Verification code generation (6 digits)
- ✅ Code expiration (10 minutes)
- ✅ New `/verify-code` endpoint
- ✅ Updated User model with verification fields

### Frontend:

- ✅ VerificationCode component with styled UI
- ✅ Updated Login component with 2FA flow
- ✅ Password validation (8-12 chars, no special chars)
- ✅ Name and email uniqueness validation
- ✅ Success message after signup

## 🔒 Security Features

- ✅ Verification codes expire after 10 minutes
- ✅ Codes are cleared after successful login
- ✅ Email validation ensures real email addresses
- ✅ Password strength requirements enforced
- ✅ Duplicate name/email prevention

## 📝 Next Steps

1. **Configure email** (see Step 1 & 2 above)
2. **Test the login flow** with an existing account
3. **Check your email** for the verification code
4. **Try the signup flow** to ensure all validations work

---

🎉 **Ready to Go!** Once you configure the email, your 2FA system will be fully functional!
