import {v2 as cloudinary} from 'cloudinary';
import {Readable} from 'stream';
import path from 'path';
import crypto from 'crypto';
import {config} from './config.js';

const isCloudinaryConfigured=Boolean(config.cloudinary.cloudName&&config.cloudinary.apiKey&&config.cloudinary.apiSecret);
if(isCloudinaryConfigured){
  cloudinary.config({cloud_name:config.cloudinary.cloudName,api_key:config.cloudinary.apiKey,api_secret:config.cloudinary.apiSecret});
}

// Cloudinary's resource_type:'auto' routes PDFs/docs through the 'image' delivery
// type, which Cloudinary blocks by default (401) as an anti-abuse security setting.
// Images/videos keep their native resource type; everything else (pdf, docx, xlsx, zip...) is uploaded as 'raw' so it serves directly without needing that setting changed.
function resourceTypeFor(mime){
  if(mime?.startsWith('image/'))return 'image';
  if(mime?.startsWith('video/')||mime?.startsWith('audio/'))return 'video';
  return 'raw';
}

export const uploadAttachment=file=>new Promise((resolve,reject)=>{
  if(!isCloudinaryConfigured){return reject(new Error('Cloudinary is not configured'))}
  const ext=path.extname(file.originalname||'');
  const base=path.basename(file.originalname||'file',ext).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,60)||'file';
  // Baking the extension into public_id makes Cloudinary's delivery URL end in
  // e.g. ".pdf", so it serves with the right Content-Type and browsers preview
  // it inline instead of defaulting to a forced download.
  const publicId=`${base}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const stream=cloudinary.uploader.upload_stream({folder:'taskflow/attachments',resource_type:resourceTypeFor(file.mimetype),public_id:publicId},(error,result)=>{
    if(error)return reject(error);
    resolve(result);
  });
  Readable.from(file.buffer).pipe(stream);
});