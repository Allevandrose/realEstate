// services/emailService.js
exports.sendEmail = async (to, subject, text) => {
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}, Body: ${text}`);
  // In production: integrate Nodemailer + SMTP
};
