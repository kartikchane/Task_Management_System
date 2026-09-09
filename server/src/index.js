import express from 'express';import http from 'http';import mongoose from 'mongoose';import cors from 'cors';import helmet from 'helmet';import compression from 'compression';import morgan from 'morgan';import rateLimit from 'express-rate-limit';import {Server} from 'socket.io';import path from 'path';import {config} from './config.js';import {createRouter} from './routes.js';import {enterpriseRouter} from './enterpriseRoutes.js';import {startScheduler} from './scheduler.js';import {User} from './models.js';import jwt from 'jsonwebtoken';
await mongoose.connect(config.mongo);console.log('MongoDB connected');try{await User.collection.dropIndex('email_1')}catch(e){console.log('No email_1 index to drop')}try{await User.collection.dropIndex('phone_1')}catch(e){console.log('No phone_1 index to drop')}await User.collection.createIndex({email:1},{unique:true,sparse:true});await User.collection.createIndex({phone:1},{unique:true,sparse:true});console.log('User indexes recreated with sparse:true');const app=express();const server=http.createServer(app);const io=new Server(server,{cors:{origin:config.client,credentials:true}});io.use((socket,next)=>{try{socket.user=jwt.verify(socket.handshake.auth?.token,config.jwt);next()}catch{next(new Error('Unauthorized'))}});io.on('connection',s=>{s.join(String(s.user.sub));if(['admin','superadmin'].includes(s.user.role)){s.join('admins:all');if(s.handshake.auth?.department)s.join('admins:'+s.handshake.auth.department)}});app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));app.use(cors({origin:config.client,credentials:true}));app.use(compression());app.use(morgan('dev'));app.use(express.json({limit:'1mb'}));app.use('/uploads',express.static(path.resolve('uploads')));app.get('/api/health',(req,res)=>res.json({status:'ok',time:new Date().toISOString()}));
const MIME_TYPES={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',txt:'text/plain',csv:'text/csv',zip:'application/zip',mp4:'video/mp4',mp3:'audio/mpeg'};
app.get('/api/attachments/view',async(req,res)=>{
  const url=req.query.url;
  const cloudName=config.cloudinary?.cloudName;
  if(!url||!cloudName||!url.startsWith(`https://res.cloudinary.com/${cloudName}/`)){
    return res.status(400).json({message:'Invalid attachment URL'});
  }
  try{
    const upstream=await fetch(url);
    if(!upstream.ok||!upstream.body)return res.status(upstream.status||502).json({message:'Unable to fetch attachment'});
    const ext=(url.split('.').pop()||'').toLowerCase().split('?')[0];
    const name=(req.query.name||url.split('/').pop()||'file').toString();
    res.setHeader('Content-Type',MIME_TYPES[ext]||upstream.headers.get('content-type')||'application/octet-stream');
    res.setHeader('Content-Disposition',`inline; filename="${name.replace(/"/g,'')}"`);
    const contentLength=upstream.headers.get('content-length');
    if(contentLength)res.setHeader('Content-Length',contentLength);
    const {Readable}=await import('stream');
    Readable.fromWeb(upstream.body).pipe(res);
  }catch(err){
    res.status(502).json({message:'Unable to fetch attachment'});
  }
});const apiLimiter=rateLimit({windowMs:60_000,limit:300});app.use('/api',apiLimiter,enterpriseRouter(io),createRouter(io));app.use((req,res)=>res.status(404).json({message:'Route not found'}));app.use((err,req,res,next)=>{console.error(err);res.status(res.statusCode>399?res.statusCode:500).json({message:err.message||'Server error'})});startScheduler(io);server.listen(config.port,()=>console.log(`API running on http://localhost:${config.port}`));