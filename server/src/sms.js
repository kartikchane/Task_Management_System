import {config} from './config.js';

export function normalizePhone(phone){
  const digits=String(phone||'').replace(/\D/g,'');
  if(digits.length===10)return digits;
  if(digits.length===12&&digits.startsWith('91'))return digits.slice(2);
  return digits;
}

export async function sendOtpSms(phone,otp){
  if(config.sms.otpDevMode||!config.sms.fast2smsKey){
    console.log(`DEV OTP for ${phone}: ${otp}`);
    return {dev:true};
  }
  const body=new URLSearchParams({
    route:config.sms.fast2smsRoute,
    variables_values:String(otp),
    numbers:String(phone)
  });
  const res=await fetch('https://www.fast2sms.com/dev/bulkV2',{
    method:'POST',
    headers:{
      authorization:config.sms.fast2smsKey,
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.return===false)throw new Error(data.message||'Unable to send OTP SMS');
  return data;
}
