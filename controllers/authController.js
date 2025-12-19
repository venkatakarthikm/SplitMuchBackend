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
  from: 'SplitMuch <support@SplitMuch.muchukarthik.me>',
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
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        
        <!-- Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 20px 30px rgba(0,0,0,0.12);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#22c55e);padding:40px 32px;text-align:center;color:#ffffff;">
              <div style="font-size:42px;line-height:1;">💸</div>
              <h1 style="margin:12px 0 4px;font-size:30px;font-weight:800;letter-spacing:-0.5px;">
                SplitMuch
              </h1>
              <p style="margin:0;font-size:15px;opacity:0.95;">
                Smarter way to split expenses with friends
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin-top:0;font-size:24px;color:#0f172a;">
                Hey ${username}! 👋
              </h2>

              <p style="font-size:16px;line-height:26px;color:#334155;">
                Welcome to <strong>SplitMuch</strong> — the easiest way to create groups, 
                share expenses, track balances, and settle up without awkward conversations.
              </p>

              <!-- Feature highlights -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="padding:10px 0;font-size:15px;color:#475569;">
                    ✅ Create groups for trips, roommates, or parties  
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:15px;color:#475569;">
                    📊 Track who owes whom — instantly  
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-size:15px;color:#475569;">
                    💰 Settle expenses fairly and transparently  
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center;margin:40px 0;">
                <a href="${verificationUrl}"
                  style="
                    display:inline-block;
                    background:linear-gradient(135deg,#22c55e,#4f46e5);
                    color:#ffffff;
                    padding:18px 38px;
                    border-radius:14px;
                    font-size:16px;
                    font-weight:700;
                    text-decoration:none;
                    box-shadow:0 10px 20px rgba(79,70,229,0.35);
                  ">
                  🚀 Verify My Account
                </a>
              </div>

              <p style="font-size:14px;color:#475569;line-height:22px;">
                ⏳ This verification link will expire in <strong>24 hours</strong>.
                If you didn’t sign up for SplitMuch, you can safely ignore this email.
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />

              <p style="font-size:13px;color:#64748b;text-align:center;line-height:20px;">
                Button not working? Copy and paste this link:
                <br />
                <a href="${verificationUrl}" style="color:#4f46e5;word-break:break-all;">
                  ${verificationUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:28px 24px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#475569;">
                Built with ❤️ for friends who value fairness.
              </p>

              <div style="margin-top:14px;">
                <a href="https://SplitMuch.muchukarthik.me"
                   style="font-size:14px;color:#4f46e5;font-weight:600;text-decoration:none;">
                  Visit Website
                </a>
                <span style="color:#cbd5e1;margin:0 10px;">•</span>
                <a href="https://SplitMuch.muchukarthik.me/support"
                   style="font-size:14px;color:#64748b;text-decoration:none;">
                  Support
                </a>
              </div>

              <p style="margin-top:16px;font-size:12px;color:#94a3b8;">
                © 2025 SplitMuch. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Container -->

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