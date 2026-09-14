import cron from 'node-cron';
import {DailyTaskTemplate,DailyWork,User,Holiday,Leave,Notification,Task} from './models.js';
const iso=()=>new Date().toISOString().slice(0,10);
const pad=(n)=>String(n).padStart(2,'0');
async function notifyOnce(io,recipient,data){
  const start=new Date(iso()+'T00:00:00'), exists=await Notification.exists({recipient,type:data.type,title:data.title,message:data.message,link:data.link,createdAt:{$gte:start}});
  if(exists)return null;
  const item=await Notification.create({recipient,...data});
  io.to(String(recipient)).emit('notification',item);
  return item;
}
export async function generateDailyWork(io,targetDate){
  const target=targetDate||iso(), now=new Date(target+'T00:00:00'), day=now.getDay(), monthDay=now.getDate();
  if(await Holiday.exists({date:target})) return 0;
  const templates=await DailyTaskTemplate.find({active:true,$or:[{cadence:'daily',workingDays:day},{cadence:'weekly',workingDays:day},{cadence:'monthly',monthlyDay:monthDay},{cadence:{$exists:false},workingDays:day}]});
  let created=0;
  for(const t of templates){
    const users=t.assigneeMode==='selected'?await User.find({_id:{$in:t.employees},status:'active'}):await User.find({department:t.department,role:'employee',status:'active'});
    let taskTitles;
    if(t.rotation&&t.checklist?.length){
      const sortedDays=[...new Set(t.workingDays?.length?t.workingDays:[1,2,3,4,5,6])].sort((a,b)=>a-b);
      const pos=sortedDays.indexOf(day);
      taskTitles=pos===-1?[]:[t.checklist[pos%t.checklist.length]];
    }else{
      taskTitles=t.checklist?.length?t.checklist:[t.title];
    }
    if(!taskTitles.length) continue;
    for(const u of users){
      if(await Leave.exists({employee:u._id,status:'approved',fromDate:{$lte:target},toDate:{$gte:target}})) continue;
      const existing=await DailyWork.findOne({employee:u._id,date:target}).select('assignedTasks');
      const already=new Set((existing?.assignedTasks||[]).filter(x=>String(x.template)===String(t._id)).map(x=>x.title));
      const toAdd=taskTitles.filter(title=>!already.has(title));
      if(!toAdd.length) continue;
      const newTasks=toAdd.map(title=>({title,description:t.description,dueTime:`${pad(t.dueHour ?? 18)}:00`,priority:t.priority||'medium',assignedBy:t.createdBy,template:t._id}));
      const row=await DailyWork.findOneAndUpdate({employee:u._id,date:target},{$setOnInsert:{department:u.department},$push:{assignedTasks:{$each:newTasks}}},{upsert:true,new:true});
      const newlyAdded=row.assignedTasks.slice(-newTasks.length);
      for(const task of newlyAdded){
        await notifyOnce(io,u._id,{type:'daily-assigned',title:'New daily task assigned',message:task.title,link:'/daily-work',meta:{kind:'daily',workId:row._id,taskId:task._id}});
      }
      io.to(String(u._id)).emit('daily-work:updated',row);
      created+=newlyAdded.length;
    }
  }
  io.emit('daily-work:generated',{date:target});
  return created;
}
export function startScheduler(io){
  // Catch-up: if the server restarted after 9am (very common in dev), don't wait for
  // tomorrow's cron tick — generate today's recurring tasks as soon as the server boots.
  generateDailyWork(io).catch(err=>console.error('Startup daily-work generation failed',err));
  cron.schedule('0 9 * * *',()=>generateDailyWork(io).catch(err=>console.error('Scheduled daily-work generation failed',err)),{timezone:process.env.TZ||'Asia/Kolkata'});
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