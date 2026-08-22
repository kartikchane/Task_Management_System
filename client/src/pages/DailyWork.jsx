import {useCallback,useState} from 'react';
import api from '../api';
import {useRefresh} from '../hooks';
import {useAuth} from '../context';
import {Button,Badge,Empty,Skeleton,Modal,Field} from '../components/UI';
import {CalendarDays,CheckCircle2,Clock3,RefreshCw,Save,Send,Users,AlertCircle} from 'lucide-react';
import toast from 'react-hot-toast';

const tone={pending:'muted','in-progress':'blue',submitted:'purple',approved:'green',rework:'orange'};
const today=()=>new Date().toISOString().slice(0,10);

export default function DailyWork(){
  const {user}=useAuth();
  return user.role==='employee'?<EmployeeDaily/>:<ManagerDaily/>;
}

function EmployeeDaily(){
  const [row,setRow]=useState(null);
  const load=useCallback(()=>api.get('/daily-work/today').then(r=>setRow(r.data)),[]);
  useRefresh(load);
  if(!row)return <Skeleton/>;
  const locked=['submitted','approved'].includes(row.status);
  const save=async()=>{const {data}=await api.patch('/daily-work/today',{progress:row.progress,workSummary:row.workSummary,blockers:row.blockers,tomorrowPlan:row.tomorrowPlan});setRow(data);toast.success('Daily progress saved')};
  const submit=async()=>{if(!row.workSummary?.trim())return toast.error('Please add today’s work summary');const {data}=await api.post('/daily-work/today/submit',{workSummary:row.workSummary,blockers:row.blockers,tomorrowPlan:row.tomorrowPlan,submissionNote:row.submissionNote});setRow(data);toast.success('Daily update submitted to manager')};
  return <>
    <div className="page-head"><div><h1>Daily Work Update</h1><p>Your fixed daily responsibility. Update progress and submit it before the working day ends.</p></div><div className="date-chip"><CalendarDays/>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div></div>
    <div className="daily-hero card"><div><span className="eyebrow">Today’s fixed task</span><h2>Daily work reporting and progress update</h2><p>Record completed work, blockers and the next-day plan. This update is visible to your Manager and Super Admin.</p></div><Badge tone={tone[row.status]}>{row.status.replace('-',' ')}</Badge></div>
    {row.status==='rework'&&<div className="notice warning"><AlertCircle/><div><b>Manager requested changes</b><p>{row.reviewNote||'Please update and submit again.'}</p></div></div>}
    {row.status==='approved'&&<div className="notice success"><CheckCircle2/><div><b>Daily update approved</b><p>Your manager has reviewed today’s work update.</p></div></div>}
    <section className="card daily-form">
      <div className="section-head"><div><h3>Progress</h3><p>Keep this updated during the day.</p></div><strong>{row.progress||0}%</strong></div>
      <input className="range-large" type="range" min="0" max="100" value={row.progress||0} disabled={locked} onChange={e=>setRow({...row,progress:Number(e.target.value)})}/>
      <div className="form-grid two">
        <Field label="Work completed today"><textarea rows="7" disabled={locked} value={row.workSummary||''} onChange={e=>setRow({...row,workSummary:e.target.value})} placeholder="Explain tasks completed, modules worked on, fixes, testing and outcomes..."/></Field>
        <div className="stack-fields"><Field label="Blockers / support needed"><textarea rows="3" disabled={locked} value={row.blockers||''} onChange={e=>setRow({...row,blockers:e.target.value})} placeholder="Mention blockers, dependencies or write None"/></Field><Field label="Plan for tomorrow"><textarea rows="3" disabled={locked} value={row.tomorrowPlan||''} onChange={e=>setRow({...row,tomorrowPlan:e.target.value})} placeholder="What will you continue or start tomorrow?"/></Field></div>
      </div>
      <Field label="Submission note"><input disabled={locked} value={row.submissionNote||''} onChange={e=>setRow({...row,submissionNote:e.target.value})} placeholder="Optional short note for your manager"/></Field>
      {!locked&&<div className="form-actions"><Button onClick={save}><Save/>Save progress</Button><Button variant="primary" onClick={submit}><Send/>Submit daily update</Button></div>}
    </section>
  </>;
}

function ManagerDaily(){
  const [rows,setRows]=useState([]),[date,setDate]=useState(today()),[status,setStatus]=useState(''),[selected,setSelected]=useState(null);
  const load=useCallback(()=>api.get('/daily-work',{params:{date,status}}).then(r=>setRows(r.data)),[date,status]);
  useRefresh(load);
  const review=async decision=>{const {data}=await api.post('/daily-work/'+selected._id+'/review',{decision,reviewNote:selected.reviewNote||''});toast.success(decision==='approved'?'Daily update approved':'Rework sent to employee');setSelected(null);load();return data};
  const counts={submitted:rows.filter(x=>x.status==='submitted').length,approved:rows.filter(x=>x.status==='approved').length,pending:rows.filter(x=>['pending','in-progress'].includes(x.status)).length,rework:rows.filter(x=>x.status==='rework').length};
  return <>
    <div className="page-head"><div><h1>Daily Work Monitor</h1><p>Review every employee’s mandatory daily update and track missing submissions.</p></div></div>
    <div className="grid cols-4"><Mini icon={<Users/>} label="Employees shown" value={rows.length}/><Mini icon={<Clock3/>} label="Pending updates" value={counts.pending}/><Mini icon={<Send/>} label="Submitted" value={counts.submitted}/><Mini icon={<CheckCircle2/>} label="Approved" value={counts.approved}/></div>
    <div className="toolbar card"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="in-progress">In progress</option><option value="submitted">Submitted</option><option value="approved">Approved</option><option value="rework">Rework</option></select><Button onClick={load}><RefreshCw/>Refresh</Button></div>
    {rows.length?<div className="daily-grid">{rows.map(x=><article className="card daily-person" key={x._id} onClick={()=>setSelected(x)}><div className="row"><div className="avatar large">{x.employee?.name?.[0]}</div><div className="grow"><h3>{x.employee?.name}</h3><p>{x.employee?.designation||'Employee'} · {x.department?.name}</p></div><Badge tone={tone[x.status]}>{x.status.replace('-',' ')}</Badge></div><div className="progress"><i style={{width:(x.progress||0)+'%'}}/></div><p className="clamp">{x.workSummary||'No work summary submitted yet.'}</p><div className="daily-meta"><span>{x.progress||0}% complete</span><span>{x.date}</span></div></article>)}</div>:<Empty/>}
    {selected&&<Modal title={selected.employee?.name+' — Daily Update'} onClose={()=>setSelected(null)} wide><div className="task-detail"><div className="detail-main"><div className="row wrap"><Badge tone={tone[selected.status]}>{selected.status}</Badge><span className="muted">{selected.date}</span></div><h4>Work completed</h4><p className="preline">{selected.workSummary||'Not provided'}</p><h4>Blockers</h4><p className="preline">{selected.blockers||'None reported'}</p><h4>Tomorrow’s plan</h4><p className="preline">{selected.tomorrowPlan||'Not provided'}</p></div><aside className="detail-side"><h4>Review</h4><dl><dt>Employee</dt><dd>{selected.employee?.name}</dd><dt>Department</dt><dd>{selected.department?.name}</dd><dt>Progress</dt><dd>{selected.progress}%</dd><dt>Submitted</dt><dd>{selected.submittedAt?new Date(selected.submittedAt).toLocaleString('en-IN'):'Not submitted'}</dd></dl>{selected.status==='submitted'&&<><Field label="Manager feedback"><textarea value={selected.reviewNote||''} onChange={e=>setSelected({...selected,reviewNote:e.target.value})} placeholder="Add feedback for employee"/></Field><Button variant="primary full" onClick={()=>review('approved')}><CheckCircle2/>Approve update</Button><Button className="btn orange full" onClick={()=>review('rework')}><RefreshCw/>Request rework</Button></>}</aside></div></Modal>}
  </>;
}
function Mini({icon,label,value}){return <div className="stat card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>Daily reporting</small></div></div>}
