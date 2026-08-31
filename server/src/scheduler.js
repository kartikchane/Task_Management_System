import cron from 'node-cron';
import {DailyTaskTemplate,DailyWork,User,Holiday,Leave,Notification,Task} from './models.js';
const iso=()=>new Date().toISOString().slice(0,10);
async function notifyOnce(io,recipient,data){
  const start=new Date(iso()+'T00:00:00'), exists=await Notification.exists({recipient,type:data.type,title:data.title,message:data.message,link:data.link,createdAt:{$gte:start}});
  if(exists)return null;
  const item=await Notification.create({recipient,...data});
  io.to(String(recipient)).emit('notification',item);
  return item;
}
export function startScheduler(io){
  cron.schedule('0 9 * * *',async()=>{
    const target=iso(), now=new Date(), day=now.getDay(), monthDay=now.getDate();
    if(await Holiday.exists({date:target})) return;
    const templates=await DailyTaskTemplate.find({active:true,$or:[{cadence:'daily',workingDays:day},{cadence:'weekly',workingDays:day},{cadence:'monthly',monthlyDay:monthDay},{cadence:{$exists:false},workingDays:day}]});
    for(const t of templates){
      const users=t.assigneeMode==='selected'?await User.find({_id:{$in:t.employees},status:'active'}):await User.find({department:t.department,role:'employee',status:'active'});
      for(const u of users){
        if(await Leave.exists({employee:u._id,status:'approved',fromDate:{$lte:target},toDate:{$gte:target}})) continue;
        await DailyWork.findOneAndUpdate({employee:u._id,date:target},{$setOnInsert:{department:u.department},$addToSet:{generatedTasks:{template:t._id,title:t.title}}},{upsert:true});
      }
    }
    io.emit('daily-work:generated',{date:target});
  },{timezone:process.env.TZ||'Asia/Kolkata'});
  cron.schedule('0 17 * * 1-6',async()=>{
    const target=iso(); const users=await User.find({role:'employee',status:'active'}).select('_id name manager');
    const managerCounts=new Map();
    for(const u of users){if(!await DailyWork.exists({employee:u._id,date:target,status:{$in:['submitted','approved']}})){await notifyOnce(io,u._id,{type:'reminder',title:'Daily update pending',message:'Please submit today’s mandatory work update.',link:'/daily-work'});if(u.manager)managerCounts.set(String(u.manager),(managerCounts.get(String(u.manager))||0)+1)}}
    for(const [manager,count] of managerCounts)await notifyOnce(io,manager,{type:'team-reminder',title:'Team daily updates pending',message:`${count} employee${count>1?'s have':' has'} not submitted today's daily update.`,link:'/daily-work'});
  },{timezone:process.env.TZ||'Asia/Kolkata'});
  cron.schedule('0 10 * * 1-6',async()=>{
    const today=iso(), start=new Date(today+'T00:00:00'), end=new Date(today+'T23:59:59');
    const tasks=await Task.find({dueDate:{$lte:end},status:{$nin:['completed','not-applicable']}}).select('title dueDate assignedTo').populate('assignedTo','name manager status').lean();
    const managerCounts=new Map();
    for(const t of tasks){if(!t.assignedTo||t.assignedTo.status!=='active')continue;const overdue=new Date(t.dueDate)<start;await notifyOnce(io,t.assignedTo._id,{type:'task-reminder',title:overdue?'Task overdue':'Task due today',message:t.title,link:'/tasks'});if(t.assignedTo.manager)managerCounts.set(String(t.assignedTo.manager),(managerCounts.get(String(t.assignedTo.manager))||0)+1)}
    for(const [manager,count] of managerCounts)await notifyOnce(io,manager,{type:'team-task-reminder',title:'Team task attention needed',message:`${count} team task${count>1?'s need':' needs'} attention today.`,link:'/tasks'});
  },{timezone:process.env.TZ||'Asia/Kolkata'});
}
