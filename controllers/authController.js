const User = require('../models/User');
const UnverifiedUser = require('../models/UnverifiedUser');
const { sendTokenResponse } = require('../utils/jwtUtils');
const { Resend } = require('resend');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// @desc    Register user (Temporary Storage)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    // 1. Basic Validation
    if (!username || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // 2. Check if user already exists in permanent DB
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email, username, or phone already exists'
      });
    }

    // 3. Hash Password before saving to temporary storage
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Generate Verification Token
    const token = crypto.randomBytes(32).toString('hex');

    // 5. Save to UnverifiedUser Collection (Temporary)
    await UnverifiedUser.create({
      username,
      email,
      phone,
      password: hashedPassword,
      verificationToken: token
    });

    // 6. Construct Verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    // 7. Send Email using your verified domain
    // controllers/authController.js

// ... inside exports.register ...
const { data, error } = await resend.emails.send({
  from: 'SplitMuch <support@splitmuch.muchukarthik.me>',
  to: email,
  subject: '🎉 Welcome to SplitMuch — Verify Your Account',
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify Your SplitMuch Account</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);border:1px solid #dddfe2;">
          
          <tr>
            <td style="padding:40px 32px;text-align:center;border-bottom:1px solid #f0f2f5;">
              <img src="https://splitmuch.onrender.com/splitmuch.png" alt="SplitMuch Logo" width="80" height="80" style="display:block;margin:0 auto;border-radius:16px;" />
              <h1 style="margin:20px 0 8px;font-size:28px;font-weight:700;color:#1c1e21;letter-spacing:-0.5px;">
                SplitMuch
              </h1>
              <p style="margin:0;font-size:16px;color:#65676b;font-weight:500;">
                The smarter way to split expenses with friends.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin-top:0;font-size:22px;color:#1c1e21;font-weight:700;">
                Hi ${username},
              </h2>

              <p style="font-size:16px;line-height:24px;color:#4b4f56;">
                Thanks for joining <strong>SplitMuch</strong>! We're excited to help you manage group expenses, track shared bills, and settle up fairly without the usual stress.
              </p>

              <div style="background-color:#f7f8fa;border-radius:8px;padding:20px;margin:30px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#1c1e21;">
                      <span style="color:#1877f2;margin-right:8px;">●</span> Create groups for trips or roommates
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#1c1e21;">
                      <span style="color:#1877f2;margin-right:8px;">●</span> Track balances in real-time
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#1c1e21;">
                      <span style="color:#1877f2;margin-right:8px;">●</span> Chat and settle bills instantly
                    </td>
                  </tr>
                </table>
              </div>

              <div style="text-align:center;margin:40px 0;">
                <a href="${verificationUrl}"
                  style="
                    display:inline-block;
                    background-color:#1877f2;
                    color:#ffffff;
                    padding:14px 44px;
                    border-radius:6px;
                    font-size:16px;
                    font-weight:700;
                    text-decoration:none;
                    transition: background-color 0.3s;
                  ">
                  Verify Account
                </a>
              </div>

              <p style="font-size:13px;color:#65676b;line-height:20px;text-align:center;">
                This link will expire in 24 hours. If you did not create this account, please ignore this email.
              </p>

              <hr style="border:none;border-top:1px solid #ebedf0;margin:32px 0;" />

              <p style="font-size:12px;color:#90949c;text-align:center;line-height:18px;">
                Button not working? Copy and paste this link into your browser:
                <br />
                <a href="${verificationUrl}" style="color:#1877f2;text-decoration:none;word-break:break-all;">
                  ${verificationUrl}
                </a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f0f2f5;padding:32px 24px;text-align:center;border-top:1px solid #dddfe2;">
              <p style="margin:0;font-size:13px;color:#65676b;font-weight:600;">
                SplitMuch Team
              </p>
              <div style="margin-top:12px;">
                <a href="https://SplitMuch.muchukarthik.me" style="font-size:12px;color:#1877f2;text-decoration:none;font-weight:600;">Website</a>
                <span style="color:#ccd0d5;margin:0 8px;">•</span>
                <a href="https://SplitMuch.muchukarthik.me/support" style="font-size:12px;color:#1877f2;text-decoration:none;font-weight:600;">Support</a>
              </div>
              <p style="margin-top:16px;font-size:11px;color:#90949c;">
                © 2025 SplitMuch. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
});


    if (error) {
      console.error("Resend Error:", error);
      return res.status(400).json({ success: false, message: "Email failed to send" });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Verification email sent! Please check your inbox.' 
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Email Link
// @route   GET /api/auth/verify-email
// @access  Public
// controllers/authController.js

// controllers/authController.js

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query; // Ensure token is extracted from query params

    if (!token) {
      return res.status(400).json({ success: false, message: 'Invalid verification token' });
    }

    // 1. Find the temporary record
    const tempUser = await UnverifiedUser.findOne({ verificationToken: token });

    if (!tempUser) {
      return res.status(400).json({ success: false, message: 'Invalid or expired link' });
    }

    // 2. Create the Permanent User
    // Crucial: The password in UnverifiedUser is ALREADY hashed
    const user = await User.create({
      username: tempUser.username,
      email: tempUser.email,
      phone: tempUser.phone,
      password: tempUser.password, // This is the hashed string from your DB
      balances: [] 
    });

    // 3. Delete the Temporary Record immediately
    await UnverifiedUser.deleteOne({ _id: tempUser._id });

    // 4. Send token response so user is logged in automatically
    // Use your utility to ensure cookies and JSON are set
    sendTokenResponse(user, 200, res);

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: 'Verification process failed' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// backend/controllers/authController.js

exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide login credentials'
      });
    }

    // IMPORTANT: Search the permanent User collection
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { phone: identifier }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please ensure your email is verified.'
      });
    }

    // Check password using the method on your User model
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // If match, send the token response
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('balances.user', 'username email');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};