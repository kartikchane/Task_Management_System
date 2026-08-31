import {z} from 'zod';

const objectId=z.string().regex(/^[0-9a-fA-F]{24}$/,'Invalid id');
const dateString=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Use YYYY-MM-DD');
const trimmed=z.string().trim().min(1);

export const validateBody=schema=>(req,res,next)=>{
  const result=schema.safeParse(req.body);
  if(!result.success){
    res.status(400);
    return next(new Error(result.error.issues.map(x=>x.message).join(', ')));
  }
  req.body=result.data;
  next();
};

export const schemas={
  department:z.object({name:trimmed,code:trimmed.max(12),description:z.string().trim().optional(),head:objectId.optional().or(z.literal('')),status:z.enum(['active','inactive']).optional()}),
  user:z.object({name:trimmed,email:z.string().email(),password:z.string().min(8).optional(),role:z.enum(['superadmin','admin','employee']).optional(),department:objectId.optional().or(z.literal('')),managedDepartments:z.array(objectId).optional(),manager:objectId.optional().or(z.literal('')),designation:z.string().trim().optional(),employeeCode:z.string().trim().optional(),shift:z.object({name:z.string().trim().optional(),startTime:z.string().trim().optional(),endTime:z.string().trim().optional()}).optional(),joiningDate:z.string().optional(),skills:z.array(z.string().trim()).optional(),phone:z.string().trim().optional(),status:z.enum(['active','blocked','resigned','archived']).optional()}),
  project:z.object({name:trimmed,code:trimmed.max(16),description:z.string().trim().optional(),department:objectId,manager:objectId.optional().or(z.literal('')),members:z.array(objectId).optional(),status:z.enum(['planning','active','on-hold','completed']).optional(),priority:z.enum(['low','medium','high','critical']).optional(),startDate:z.string().optional().or(z.literal('')),endDate:z.string().optional().or(z.literal(''))}),
  task:z.object({title:trimmed,description:trimmed,project:objectId,department:objectId,assignedTo:objectId,priority:z.enum(['low','medium','high','critical']).optional(),dueDate:z.string().min(1),status:z.enum(['completed','in-progress','pending','overdue','not-applicable']).optional(),completionRequirements:z.array(z.enum(['photo','document','excel','invoice','screenshot','customer-confirmation','remark'])).optional()}),
  taskProgress:z.object({progress:z.coerce.number().min(0).max(100)}),
  taskComment:z.object({text:trimmed.max(2000)}),
  taskSubmit:z.object({note:z.string().trim().max(2000).optional()}),
  taskReview:z.object({decision:z.enum(['completed','in-progress','pending','overdue','not-applicable']),note:z.string().trim().optional(),points:z.coerce.number().min(0).optional(),quality:z.coerce.number().min(0).optional(),rating:z.coerce.number().min(0).max(5).optional()}),
  password:z.object({currentPassword:z.string().min(1),newPassword:z.string().min(8)}),
  profile:z.object({name:trimmed.optional(),phone:z.string().trim().optional(),designation:z.string().trim().optional(),skills:z.array(z.string().trim()).optional()}),
  forgot:z.object({email:z.string().email()}),
  otpSend:z.object({phone:z.string().trim().min(10)}),
  otpVerify:z.object({phone:z.string().trim().min(10),otp:z.string().trim().regex(/^\d{4,8}$/,'Invalid OTP')}),
  reset:z.object({token:trimmed,password:z.string().min(8)}),
  register:z.object({name:trimmed,email:z.string().default(''),password:z.string().min(8),role:z.enum(['admin','employee']),department:objectId.optional().or(z.literal('')),designation:z.string().trim().optional(),phone:z.string().default('')}).refine(x=>(x.email&&x.email.trim())||(x.phone&&x.phone.trim()),{message:'Email or phone number is required'}).refine(x=>!x.email||x.email.includes('@'),{message:'Invalid email format'}),
  leave:z.object({type:z.enum(['casual','sick','earned','unpaid','other']).optional(),fromDate:dateString,toDate:dateString,reason:trimmed.max(1000)}).refine(x=>x.toDate>=x.fromDate,{message:'To date must be after or same as from date'}),
  leaveReview:z.object({decision:z.enum(['approved','rejected']),note:z.string().trim().optional()}),
  dailyTemplate:z.object({title:trimmed,description:z.string().trim().optional(),department:objectId,cadence:z.enum(['daily','weekly','monthly']).optional(),assigneeMode:z.enum(['department','selected']).optional(),employees:z.array(objectId).optional(),checklist:z.array(z.string().trim()).optional(),workingDays:z.array(z.coerce.number().min(0).max(6)).optional(),monthlyDay:z.coerce.number().min(1).max(31).optional(),dueHour:z.coerce.number().min(0).max(23).optional(),active:z.boolean().optional()}),
  dailyWork:z.object({progress:z.coerce.number().min(0).max(100).optional(),workSummary:z.string().trim().optional(),blockers:z.string().trim().optional(),tomorrowPlan:z.string().trim().optional()}),
  dailySubmit:z.object({workSummary:trimmed.max(4000),blockers:z.string().trim().optional(),tomorrowPlan:z.string().trim().optional(),submissionNote:z.string().trim().optional()}),
  settings:z.record(z.any())
};
