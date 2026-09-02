import {Router} from 'express'; import asyncHandler from 'express-async-handler'; import crypto from 'crypto'; import bcrypt from 'bcryptjs'; import ExcelJS from 'exceljs';
import {User,Department,DailyTaskTemplate,DailyWork,Attendance,Leave,Holiday,ResetToken,Task,Activity} from './models.js'; import {protect,allow,scopeFilter,signToken} from './auth.js'; import {notify,logActivity,cleanUser,emitOps,teamEmployeeIds} from './helpers.js'; import {validateBody,schemas} from './validation.js';
import {sendPasswordResetEmail,sendRegistrationEmail} from './mailer.js';
const date=()=>new Date().toISOString().slice(0,10); const dep=id=>id?._id||id;
const teamTaskScope=async req=>req.user.role==='admin'?{assignedTo:{$in:await teamEmployeeIds(req,User)}}:scopeFilter(req);
const teamEmployeeScope=async req=>req.user.role==='admin'?{employee:{$in:await teamEmployeeIds(req,User)}}:{};
const activeEmployeeScope=async req=>req.user.role==='admin'?{role:'employee',status:'active',manager:req.user._id}:{role:'employee',status:'active'};
export function enterpriseRouter(io){const r=Router();
r.post('/auth/forgot-password',validateBody(schemas.forgot),asyncHandler(async(req,res)=>{const u=await User.findOne({email:String(req.body.email||'').toLowerCase()}); if(u){const raw=crypto.randomBytes(24).toString('hex'); await ResetToken.create({user:u._id,tokenHash:crypto.createHash('sha256').update(raw).digest('hex'),expiresAt:new Date(Date.now()+30*60*1000)}); await sendPasswordResetEmail(u,`${process.env.CLIENT_URL||'http://localhost:5173'}/reset-password?token=${raw}`)} res.json({message:'If the email exists, a reset link has been sent.'})}));
r.post('/auth/reset-password',validateBody(schemas.reset),asyncHandler(async(req,res)=>{const hash=crypto.createHash('sha256').update(req.body.token||'').digest('hex'); const t=await ResetToken.findOne({tokenHash:hash,used:false,expiresAt:{$gt:new Date()}}); if(!t){res.status(400);throw new Error('Invalid or expired reset token')} const u=await User.findById(t.user).select('+password'); u.password=await bcrypt.hash(req.body.password,12);u.mustChangePassword=false;await u.save();t.used=true;await t.save();res.json({message:'Password reset successful'})}));
r.get('/auth/departments',asyncHandler(async(req,res)=>res.json(await Department.find({status:'active'}).select('name code').sort('name'))));
r.post('/auth/register',validateBody(schemas.register),asyncHandler(async(req,res)=>{if(req.body.email.trim()&&await User.exists({email:req.body.email.toLowerCase()})){res.status(409);throw new Error('Email is already registered')}if(req.body.phone.trim()&&await User.exists({phone:req.body.phone})){res.status(409);throw new Error('Phone number is already registered')}const data={name:req.body.name,password:await bcrypt.hash(req.body.password,12),role:req.body.role,designation:req.body.designation,mustChangePassword:false,status:'active'};if(req.body.email.trim())data.email=req.body.email.toLowerCase();if(req.body.phone.trim())data.phone=req.body.phone.trim();if(data.role==='admin'){data.department=undefined;data.manager=undefined}else{if(!req.body.department){res.status(400);throw new Error('Select a department')}const department=await Department.findOne({_id:req.body.department,status:'active'});if(!department){res.status(400);throw new Error('Select a valid active department')}if(!department.head){res.status(400);throw new Error('This department does not have a manager yet')}data.department=req.body.department;data.manager=department.head}const user=await User.create(data);await logActivity({user,ip:req.ip},'register','User',user._id,{email:user.email,role:user.role});const full=await user.populate('department','name code');sendRegistrationEmail(full).catch(err=>console.error('Registration email failed:',err.message));emitOps(io,full.department,'user:updated',{id:user._id,action:'registered'});emitOps(io,full.department,'dashboard:updated');res.status(201).json({token:signToken(full),user:cleanUser(full)})}));
r.use((req,res,next)=>req.path.startsWith('/auth/')?next('router'):protect(req,res,next));
r.get('/manager-insights',allow('superadmin','admin'),asyncHandler(async(req,res)=>{
  const today=date(),start=new Date(today+'T00:00:00'),end=new Date(today+'T23:59:59');
  const employees=await User.find(await activeEmployeeScope(req)).select('name email designation department manager avatar').populate('department','name code').sort('name').lean();
  const ids=employees.map(x=>x._id);
  const [attendance,dailyRows,pendingLeaves]=await Promise.all([
    Attendance.find({employee:{$in:ids},date:today}).lean(),
    DailyWork.find({employee:{$in:ids},date:{$lte:today}}).select('employee date assignedTasks status').lean(),
    Leave.countDocuments({employee:{$in:ids},status:'pending'}),
  ]);
  const byEmployee=new Map(employees.map(e=>[String(e._id),{employee:e,attendance:null,daily:null,tasks:[],overdue:0,dueToday:0,inProgress:0,submitted:0,risk:0,signals:[]}]));
  attendance.forEach(a=>{const row=byEmployee.get(String(a.employee));if(row)row.attendance=a});
  let pendingReviews=0;
  dailyRows.forEach(dw=>{
    const row=byEmployee.get(String(dw.employee));
    if(!row)return;
    if(dw.date===today)row.daily=dw;
    for(const task of dw.assignedTasks||[]){
      if(task.status==='in-progress')row.inProgress++;
      if(task.status==='submitted'){row.submitted++;pendingReviews++}
      const open=!['submitted','approved'].includes(task.status);
      if(open){
        row.tasks.push(task);
        if(dw.date===today)row.dueToday++;
        else if(dw.date<today)row.overdue++;
      }
    }
  });
  const team=[...byEmployee.values()].map(row=>{
    if(!row.attendance){row.risk+=2;row.signals.push('No check-in')}
    else if(row.attendance.status==='late'){row.risk+=1;row.signals.push('Late')}
    if(!row.daily||!['submitted','approved'].includes(row.daily.status)){row.risk+=2;row.signals.push('Daily update pending')}
    if(row.overdue){row.risk+=row.overdue*4;row.signals.push(`${row.overdue} overdue task${row.overdue>1?'s':''}`)}
    return {...row,taskCount:row.tasks.length};
  }).sort((a,b)=>b.risk-a.risk||b.overdue-a.overdue);
  const summary={
    teamSize:employees.length,
    present:attendance.filter(x=>['present','half-day'].includes(x.status)).length,
    late:attendance.filter(x=>x.status==='late').length,
    missingCheckIn:employees.length-attendance.length,
    dailySubmitted:team.filter(x=>['submitted','approved'].includes(x.daily?.status)).length,
    missingDaily:team.filter(x=>!['submitted','approved'].includes(x.daily?.status)).length,
    overdue:team.reduce((n,x)=>n+x.overdue,0),
    dueToday:team.reduce((n,x)=>n+x.dueToday,0),
    pendingReviews,
    pendingLeaves,
  };
  const alerts=[];
  if(summary.overdue)alerts.push({tone:'danger',title:'Overdue work',message:`${summary.overdue} daily task${summary.overdue>1?'s are':' is'} overdue across the team.`,link:'/daily-work'});
  if(summary.missingDaily)alerts.push({tone:'warn',title:'Daily updates pending',message:`${summary.missingDaily} employee${summary.missingDaily>1?'s have':' has'} not submitted today's update.`,link:'/daily-work'});
  if(summary.pendingReviews)alerts.push({tone:'info',title:'Review queue',message:`${summary.pendingReviews} submitted task${summary.pendingReviews>1?'s are':' is'} waiting for review.`,link:'/daily-work'});
  res.json({summary,alerts,team:team.slice(0,8),date:today});
}));
r.get('/approvals',allow('superadmin','admin'),asyncHandler(async(req,res)=>{
  const taskScope=await teamTaskScope(req);
  const employeeScope=await teamEmployeeScope(req);
  const [tasks,leaves,dailyRows]=await Promise.all([
    Task.find({...taskScope,status:'submitted'}).populate('assignedTo','name email designation').populate('project','name code').populate('department','name code').sort('-updatedAt').limit(100).lean(),
    Leave.find({...employeeScope,status:'pending'}).populate('employee','name email designation').sort('-createdAt').limit(100).lean(),
    DailyWork.find({...employeeScope,'assignedTasks.status':'submitted'}).populate('employee','name email designation').populate('department','name code').sort('-updatedAt').limit(100).lean(),
  ]);
  const dailyWork=[];
  for(const row of dailyRows){
    for(const task of row.assignedTasks||[]){
      if(task.status==='submitted')dailyWork.push({_id:task._id,workId:row._id,title:task.title,priority:task.priority,progress:task.progress,submissionNote:task.submissionNote,submittedAt:task.submittedAt,dueTime:task.dueTime,date:row.date,employee:row.employee,department:row.department});
    }
  }
  res.json({tasks,leaves,dailyWork,total:tasks.length+leaves.length+dailyWork.length});
}));
r.get('/daily-templates',allow('superadmin','admin'),asyncHandler(async(req,res)=>res.json(await DailyTaskTemplate.find(req.user.role==='superadmin'?{}:{department:dep(req.user.department)}).populate('department','name').populate('employees','name'))));
r.post('/daily-templates',allow('superadmin','admin'),validateBody(schemas.dailyTemplate),asyncHandler(async(req,res)=>{if(req.user.role==='admin'){if(!req.user.department){res.status(400);throw new Error('Create your department before adding daily templates')}const teamIds=await teamEmployeeIds(req,User);if(req.body.employees?.some(id=>!teamIds.some(t=>String(t)===String(id)))){res.status(403);throw new Error('Select employees only from your team')}req.body.department=dep(req.user.department)}const x=await DailyTaskTemplate.create({...req.body,createdBy:req.user._id});await logActivity(req,'create','DailyTaskTemplate',x._id);emitOps(io,x.department,'daily-template:updated',{id:x._id,action:'created'});res.status(201).json(x)}));
r.patch('/daily-templates/:id',allow('superadmin','admin'),validateBody(schemas.dailyTemplate.partial()),asyncHandler(async(req,res)=>{const q={_id:req.params.id,...(req.user.role==='superadmin'?{}:{department:dep(req.user.department)})};if(req.user.role==='admin'){const teamIds=await teamEmployeeIds(req,User);if(req.body.employees?.some(id=>!teamIds.some(t=>String(t)===String(id)))){res.status(403);throw new Error('Select employees only from your team')}req.body.department=dep(req.user.department)}const x=await DailyTaskTemplate.findOneAndUpdate(q,req.body,{new:true,runValidators:true});emitOps(io,x?.department,'daily-template:updated',{id:req.params.id,action:'updated'});res.json(x)}));
r.delete('/daily-templates/:id',allow('superadmin','admin'),asyncHandler(async(req,res)=>{const x=await DailyTaskTemplate.findOneAndDelete({_id:req.params.id,...(req.user.role==='superadmin'?{}:{department:dep(req.user.department)})});emitOps(io,x?.department,'daily-template:updated',{id:req.params.id,action:'deleted'});res.json({message:'Template archived/deleted'})}));
r.post('/daily-templates/generate',allow('superadmin','admin'),asyncHandler(async(req,res)=>{const target=req.body.date||date(),calendarDay=new Date(target+'T00:00:00'),day=calendarDay.getDay(),monthDay=calendarDay.getDate();if(await Holiday.exists({date:target}))return res.json({message:'Holiday - no work generated',created:0});const templates=await DailyTaskTemplate.find({active:true,$or:[{cadence:'daily',workingDays:day},{cadence:'weekly',workingDays:day},{cadence:'monthly',monthlyDay:monthDay},{cadence:{$exists:false},workingDays:day}],...(req.user.role==='superadmin'?{}:{department:dep(req.user.department)})});let created=0;const departments=new Set();for(const t of templates){const userScope=req.user.role==='admin'?{manager:req.user._id}:{},users=t.assigneeMode==='selected'?await User.find({...userScope,_id:{$in:t.employees},status:'active'}):await User.find({...userScope,department:t.department,role:'employee',status:'active'});for(const u of users){if(await Leave.exists({employee:u._id,status:'approved',fromDate:{$lte:target},toDate:{$gte:target}}))continue;const existed=await DailyWork.exists({employee:u._id,date:target});await DailyWork.findOneAndUpdate({employee:u._id,date:target},{$setOnInsert:{department:u.department},$addToSet:{generatedTasks:{template:t._id,title:t.title}}},{upsert:true,new:true});departments.add(String(u.department));io.to(String(u._id)).emit('daily-work:generated',{date:target});if(!existed)created++}}for(const department of departments){emitOps(io,department,'daily-work:generated',{date:target});emitOps(io,department,'dashboard:updated')}res.json({message:'Recurring work generation complete',created})}));
r.get('/attendance/today',allow('employee'),asyncHandler(async(req,res)=>res.json(await Attendance.findOne({employee:req.user._id,date:date()}))));
r.post('/attendance/check-in',allow('employee'),asyncHandler(async(req,res)=>{const now=new Date();const x=await Attendance.findOneAndUpdate({employee:req.user._id,date:date()},{$setOnInsert:{department:dep(req.user.department),checkIn:now,status:'present'}},{new:true,upsert:true});emitOps(io,dep(req.user.department),'attendance:updated',x);emitOps(io,dep(req.user.department),'dashboard:updated');res.json(x)}));
r.post('/attendance/check-out',allow('employee'),asyncHandler(async(req,res)=>{const x=await Attendance.findOne({employee:req.user._id,date:date()});if(!x?.checkIn){res.status(400);throw new Error('Check in first')}x.checkOut=new Date();x.workedMinutes=Math.max(0,Math.round((x.checkOut-x.checkIn)/60000)-x.breakMinutes);await x.save();emitOps(io,x.department,'attendance:updated',x);emitOps(io,x.department,'dashboard:updated');res.json(x)}));
r.get('/attendance',allow('superadmin','admin'),asyncHandler(async(req,res)=>{const q=await teamEmployeeScope(req);if(req.query.date)q.date=req.query.date;res.json(await Attendance.find(q).populate('employee','name email designation').sort('-date -createdAt').limit(500))}));
r.patch('/attendance/:id',allow('superadmin','admin'),asyncHandler(async(req,res)=>{const allowed=['present','late','half-day','absent','leave','holiday'];if(!allowed.includes(req.body.status)){res.status(400);throw new Error('Select a valid attendance status')}const q={_id:req.params.id,...(await teamEmployeeScope(req))};const x=await Attendance.findOneAndUpdate(q,{status:req.body.status,note:String(req.body.note||'').trim()},{new:true,runValidators:true}).populate('employee','name email designation');if(!x){res.status(404);throw new Error('Attendance record not found')}await notify(io,x.employee._id||x.employee,{type:'attendance',title:'Attendance updated',message:`Your attendance status is marked ${x.status}.`,link:'/attendance'});io.to(String(x.employee._id||x.employee)).emit('attendance:updated',x);emitOps(io,x.department,'attendance:updated',x);emitOps(io,x.department,'dashboard:updated');res.json(x)}));
r.get('/leaves',asyncHandler(async(req,res)=>{const q=req.user.role==='employee'?{employee:req.user._id}:await teamEmployeeScope(req);res.json(await Leave.find(q).populate('employee','name email').populate('reviewedBy','name').sort('-createdAt'))}));
r.post('/leaves',allow('employee'),validateBody(schemas.leave),asyncHandler(async(req,res)=>{const x=await Leave.create({...req.body,employee:req.user._id,department:dep(req.user.department)});if(req.user.manager)await notify(io,req.user.manager,{type:'leave-request',title:'Leave request pending',message:`${req.user.name} requested leave from ${x.fromDate} to ${x.toDate}.`,link:'/approvals'});emitOps(io,x.department,'leave:updated',x);emitOps(io,x.department,'calendar:updated');res.status(201).json(x)}));
r.post('/leaves/:id/review',allow('superadmin','admin'),validateBody(schemas.leaveReview),asyncHandler(async(req,res)=>{const q={_id:req.params.id,...(await teamEmployeeScope(req))};const x=await Leave.findOneAndUpdate(q,{status:req.body.decision,reviewNote:req.body.note||'',reviewedBy:req.user._id,reviewedAt:new Date()},{new:true});if(!x){res.status(404);throw new Error('Leave not found')}await notify(io,x.employee,{type:'leave',title:`Leave ${x.status}`,message:x.reviewNote||`${x.fromDate} to ${x.toDate}`,link:'/leave'});io.to(String(x.employee)).emit('leave:updated',x);emitOps(io,x.department,'leave:updated',x);emitOps(io,x.department,'calendar:updated');res.json(x)}));
r.get('/holidays',asyncHandler(async(req,res)=>res.json(await Holiday.find().sort('date'))));
r.post('/holidays',allow('superadmin'),asyncHandler(async(req,res)=>{const x=await Holiday.create(req.body);emitOps(io,null,'calendar:updated',x);res.status(201).json(x)}));
r.delete('/holidays/:id',allow('superadmin'),asyncHandler(async(req,res)=>{await Holiday.findByIdAndDelete(req.params.id);emitOps(io,null,'calendar:updated',{id:req.params.id,action:'deleted'});res.json({message:'Holiday deleted'})}));
r.get('/calendar',asyncHandler(async(req,res)=>{const from=req.query.from||date(),to=req.query.to||date();const taskQ=req.user.role==='employee'?{assignedTo:req.user._id}:await teamTaskScope(req);const leaveQ=req.user.role==='employee'?{employee:req.user._id}:{...(await teamEmployeeScope(req)),fromDate:{$lte:to},toDate:{$gte:from}};const [tasks,leaves,holidays]=await Promise.all([Task.find({...taskQ,dueDate:{$gte:new Date(from),$lte:new Date(to+'T23:59:59')}}).select('title dueDate status priority assignedTo').populate('assignedTo','name'),Leave.find(leaveQ).populate('employee','name'),Holiday.find({date:{$gte:from,$lte:to}})]);res.json({tasks,leaves,holidays})}));
r.get('/audit',allow('superadmin'),asyncHandler(async(req,res)=>res.json(await Activity.find().populate('actor','name email role').sort('-createdAt').limit(1000))));
r.get('/reports/export',allow('superadmin','admin'),asyncHandler(async(req,res)=>{
  const q=req.user.role==='admin'?{employee:{$in:await teamEmployeeIds(req,User)}}:{};
  if(req.user.role==='superadmin'&&req.query.department)q.department=req.query.department;
  if(req.query.from||req.query.to)q.date={...(req.query.from?{$gte:req.query.from}:{}),...(req.query.to?{$lte:req.query.to}:{})};
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('Daily Tasks');
  ws.columns=[{header:'Title',key:'title',width:35},{header:'Employee',key:'employee',width:25},{header:'Department',key:'department',width:24},{header:'Status',key:'status',width:15},{header:'Priority',key:'priority',width:15},{header:'Progress',key:'progress',width:12},{header:'Date',key:'date',width:14},{header:'Due Time',key:'due',width:12}];
  const rows=await DailyWork.find(q).populate('employee','name').populate('department','name').select('employee department date assignedTasks').lean();
  for(const row of rows){
    if(req.query.status&&!(row.assignedTasks||[]).some(t=>t.status===req.query.status))continue;
    for(const t of row.assignedTasks||[]){
      if(req.query.status&&t.status!==req.query.status)continue;
      ws.addRow({title:t.title,employee:row.employee?.name,department:row.department?.name,status:t.status,priority:t.priority,progress:t.progress,date:row.date,due:t.dueTime});
    }
  }
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename=taskflow-daily-work-report.xlsx');
  await wb.xlsx.write(res);
  res.end();
}));
return r}