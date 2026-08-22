import nodemailer from 'nodemailer';
import {config} from './config.js';

const configured=()=>Boolean(config.smtp.host&&config.smtp.user&&config.smtp.pass);

function transport(){
  if(!configured())throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_USER and SMTP_PASS in server .env.');
  return nodemailer.createTransport({
    host:config.smtp.host,
    port:config.smtp.port,
    secure:config.smtp.secure,
    auth:{user:config.smtp.user,pass:config.smtp.pass}
  });
}

export async function sendPasswordResetEmail(user,link){
  const html=`<!doctype html>
  <html>
    <body style="margin:0;background:#f5f6fb;font-family:Arial,sans-serif;color:#17182b">
      <div style="max-width:560px;margin:0 auto;padding:28px">
        <div style="background:#ffffff;border:1px solid #e2e6f0;border-radius:16px;padding:28px">
          <div style="font-weight:800;font-size:18px;margin-bottom:18px;color:#635bff">Ganesh Gauri Industries</div>
          <h2 style="margin:0 0 10px;font-size:26px">Reset your password</h2>
          <p style="color:#606378;line-height:1.6">Hi ${user.name||'there'}, use this secure one-time link to create a new password. This link expires in 30 minutes.</p>
          <a href="${link}" style="display:inline-block;background:#635bff;color:#fff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px;margin:14px 0">Reset password</a>
          <p style="font-size:12px;color:#73768c;line-height:1.6">If the button does not work, copy and paste this link in your browser:<br/>${link}</p>
          <p style="font-size:12px;color:#73768c;margin-top:22px">If you did not request this, you can ignore this email.</p>
        </div>
      </div>
    </body>
  </html>`;
  await transport().sendMail({
    from:config.smtp.from,
    to:user.email,
    subject:'Reset your Ganesh Gauri Industries password',
    html,
    text:`Reset your password: ${link}\n\nThis link expires in 30 minutes.`
  });
}

export async function sendRegistrationEmail(user){
  const roleLabel=user.role==='admin'?'Admin':'Employee';
  const html=`<!doctype html>
  <html>
    <body style="margin:0;background:#f5f6fb;font-family:Arial,sans-serif;color:#17182b">
      <div style="max-width:560px;margin:0 auto;padding:28px">
        <div style="background:#ffffff;border:1px solid #e2e6f0;border-radius:16px;padding:28px">
          <div style="font-weight:800;font-size:18px;margin-bottom:18px;color:#635bff">Ganesh Gauri Industries</div>
          <h2 style="margin:0 0 10px;font-size:26px">Registration successful</h2>
          <p style="color:#606378;line-height:1.6">Hi ${user.name||'there'}, your ${roleLabel} account has been created successfully for Ganesh Gauri Industries.</p>
          <div style="background:#f7f8fc;border:1px solid #e6e8f1;border-radius:12px;padding:14px;margin:18px 0">
            <p style="margin:0 0 8px;color:#606378;font-size:13px">Account email</p>
            <strong>${user.email}</strong>
          </div>
          <a href="${config.client}/login" style="display:inline-block;background:#635bff;color:#fff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:10px;margin:8px 0">Open workspace</a>
          <p style="font-size:12px;color:#73768c;margin-top:22px">You can now sign in and start using your workspace.</p>
        </div>
      </div>
    </body>
  </html>`;
  await transport().sendMail({
    from:config.smtp.from,
    to:user.email,
    subject:'Welcome to Ganesh Gauri Industries TaskFlow',
    html,
    text:`Hi ${user.name||'there'}, your ${roleLabel} account has been created successfully. Sign in: ${config.client}/login`
  });
}
