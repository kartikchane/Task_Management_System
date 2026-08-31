import {Activity,Notification} from './models.js';
export async function logActivity(req,action,entityType,entityId,details={}){await Activity.create({actor:req.user?._id,action,entityType,entityId,details,ip:req.ip})}
export async function notify(io,recipient,data){const item=await Notification.create({recipient,...data});io.to(String(recipient)).emit('notification',item);return item}
export const cleanUser=(u)=>({id:u._id,name:u.name,email:u.email,phone:u.phone,role:u.role,department:u.department,managedDepartments:u.managedDepartments||[],designation:u.designation,employeeCode:u.employeeCode,shift:u.shift,skills:u.skills,status:u.status,avatar:u.avatar});
export function emitOps(io,department,event,payload={}){let target=io.to('admins:all');if(department)target=target.to('admins:'+String(department?._id||department));target.emit(event,payload)}
export async function teamEmployeeIds(req,UserModel){if(req.user.role!=='admin')return null;const rows=await UserModel.find({manager:req.user._id,role:'employee',status:{$ne:'archived'}}).select('_id').lean();return rows.map(x=>x._id)}
