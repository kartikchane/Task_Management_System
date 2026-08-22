import dotenv from 'dotenv';
dotenv.config();
export const config={
  port:Number(process.env.PORT||5000),
  mongo:process.env.MONGO_URI||'mongodb://127.0.0.1:27017/taskflow',
  jwt:process.env.JWT_SECRET||'dev-secret-change-me',
  expires:process.env.JWT_EXPIRES_IN||'7d',
  client:process.env.CLIENT_URL||'http://localhost:5173',
  uploadProvider:process.env.UPLOAD_PROVIDER||'local',
  cloudinary:{
    cloudName:process.env.CLOUDINARY_CLOUD_NAME||'',
    apiKey:process.env.CLOUDINARY_API_KEY||'',
    apiSecret:process.env.CLOUDINARY_API_SECRET||''
  },
  smtp:{
    host:process.env.SMTP_HOST||'',
    port:Number(process.env.SMTP_PORT||587),
    secure:String(process.env.SMTP_SECURE||'false')==='true',
    user:process.env.SMTP_USER||'',
    pass:process.env.SMTP_PASS||'',
    from:process.env.SMTP_FROM||process.env.SMTP_USER||'Ganesh Gauri Industries <no-reply@taskflow.local>'
  },
  sms:{
    provider:process.env.SMS_PROVIDER||'dev',
    fast2smsKey:process.env.FAST2SMS_API_KEY||'',
    fast2smsRoute:process.env.FAST2SMS_ROUTE||'otp',
    otpDevMode:String(process.env.OTP_DEV_MODE||'true')==='true'
  }
};
