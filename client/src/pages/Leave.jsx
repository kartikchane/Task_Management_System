import {useCallback,useMemo,useState} from 'react';
import api from '../api';
import {Button,Badge,Empty,Field,Skeleton} from '../components/UI';
import {useAuth} from '../context';
import {useRefresh} from '../hooks';
import {CalendarDays,CheckCircle2,RefreshCw,Send,XCircle} from 'lucide-react';
import toast from 'react-hot-toast';

const tones={pending:'orange',approved:'green',rejected:'red',cancelled:'muted'};

export default function Leave(){
  const {user}=useAuth();
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [f,setF]=useState({type:'casual',fromDate:'',toDate:'',reason:''});
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return api.get('/leaves').then(r=>setRows(r.data)).catch(e=>{
      setError(e.response?.data?.message||'Unable to load leave records');
      setRows([]);
    }).finally(()=>setLoading(false));
  },[]);
  useRefresh(load);
  const counts=useMemo(()=>({
    pending:rows.filter(x=>x.status==='pending').length,
    approved:rows.filter(x=>x.status==='approved').length,
    rejected:rows.filter(x=>x.status==='rejected').length,
    total:rows.length
  }),[rows]);
  const submit=async e=>{
    e.preventDefault();
    try{
      await api.post('/leaves',f);
      toast.success('Leave request submitted');
      setF({type:'casual',fromDate:'',toDate:'',reason:''});
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to submit leave request');
    }
  };
  const review=async(id,decision)=>{
    try{
      await api.post('/leaves/'+id+'/review',{decision});
      toast.success(decision==='approved'?'Leave approved':'Leave rejected');
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to review leave');
    }
  };
  return <>
    <div className="page-head"><div><h1>Leave Management</h1><p>{user.role==='employee'?'Request leave and track approvals.':'Review employee leave requests across your scope.'}</p></div></div>
    <div className="grid cols-4">
      <Mini icon={<CalendarDays/>} label="Requests" value={counts.total}/>
      <Mini icon={<RefreshCw/>} label="Pending" value={counts.pending}/>
      <Mini icon={<CheckCircle2/>} label="Approved" value={counts.approved}/>
      <Mini icon={<XCircle/>} label="Rejected" value={counts.rejected}/>
    </div>
    {user.role==='employee'&&<form className="card daily-form" onSubmit={submit}>
      <div className="section-head"><div><h3>New Request</h3><p>Submit dates and reason for manager review.</p></div></div>
      <div className="form-grid two">
        <Field label="Type"><select value={f.type} onChange={e=>setF({...f,type:e.target.value})}><option>casual</option><option>sick</option><option>earned</option><option>unpaid</option><option>other</option></select></Field>
        <Field label="From"><input type="date" required value={f.fromDate} onChange={e=>setF({...f,fromDate:e.target.value})}/></Field>
        <Field label="To"><input type="date" required value={f.toDate} onChange={e=>setF({...f,toDate:e.target.value})}/></Field>
        <Field label="Reason"><textarea required value={f.reason} onChange={e=>setF({...f,reason:e.target.value})}/></Field>
      </div>
      <div className="form-actions"><Button variant="primary"><Send/>Submit Request</Button></div>
    </form>}
    <div className="toolbar card"><span>{rows.length} leave request{rows.length===1?'':'s'}</span><Button onClick={load}><RefreshCw/>Refresh</Button></div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load leave" text={error}/>:rows.length?<div className="table-wrap card"><table><thead><tr><th>Employee</th><th>Dates</th><th>Type</th><th>Status</th><th>Reviewed by</th><th>Action</th></tr></thead><tbody>{rows.map(x=><tr key={x._id}><td><div className="person"><div className="avatar">{(x.employee?.name||user.name)?.[0]}</div><div><b>{x.employee?.name||user.name}</b><span>{x.employee?.email||user.email}</span></div></div></td><td>{x.fromDate} to {x.toDate}</td><td>{x.type}</td><td><Badge tone={tones[x.status]}>{x.status}</Badge></td><td>{x.reviewedBy?.name||'-'}</td><td>{user.role!=='employee'&&x.status==='pending'?<div className="actions"><button type="button" onClick={()=>review(x._id,'approved')} title="Approve"><CheckCircle2/></button><button type="button" onClick={()=>review(x._id,'rejected')} title="Reject"><XCircle/></button></div>:'-'}</td></tr>)}</tbody></table></div>:<Empty title="No leave requests" text={user.role==='employee'?'Your leave requests will appear here.':'No employee leave requests are available yet.'}/>}
  </>;
}

function Mini({icon,label,value}){return <div className="stat card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>Leave</small></div></div>}
