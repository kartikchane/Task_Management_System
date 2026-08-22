import {v2 as cloudinary} from 'cloudinary';
import {Readable} from 'stream';
import {config} from './config.js';

const isCloudinaryConfigured=Boolean(config.cloudinary.cloudName&&config.cloudinary.apiKey&&config.cloudinary.apiSecret);
if(isCloudinaryConfigured){
  cloudinary.config({cloud_name:config.cloudinary.cloudName,api_key:config.cloudinary.apiKey,api_secret:config.cloudinary.apiSecret});
}

export const uploadAttachment=file=>new Promise((resolve,reject)=>{
  if(!isCloudinaryConfigured){return reject(new Error('Cloudinary is not configured'))}
  const stream=cloudinary.uploader.upload_stream({folder:'taskflow/attachments',resource_type:'auto'},(error,result)=>{
    if(error)return reject(error);
    resolve(result);
  });
  Readable.from(file.buffer).pipe(stream);
});