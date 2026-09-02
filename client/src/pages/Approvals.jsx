import {useCallback,useState} from 'react';
import api from '../api';
import {useRefresh} from '../hooks';
import {Badge,Button,Empty,Skeleton} from '../components/UI';
import {CheckCircle2,Clock3,Plane,RefreshCw,RotateCcw,ListTodo,XCircle} from 'lucide-react';
import toast from 'react-hot-toast';

const tones={high:'orange',critical:'red',medium:'blue',low:'muted'};

export default function Approvals(){
  const [data,setData]=useState({tasks:[],leaves:[],dailyWork:[],total:0}),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return api.get('/approvals').then(r=>setData(r.data)).catch(e=>{
      setError(e.response?.data?.message||'Unable to load approval inbox');
      setData({tasks:[],leaves:[],dailyWork:[],total:0});
    }).finally(()=>setLoading(false));
  },[]);
  useRefresh(load);
  const act=async(fn,success)=>{
    try{
      await fn();
      toast.success(success);
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Action failed');
    }
  };
  if(loading)return <Skeleton/>;
  if(error)return <Empty title="Unable to load approvals" text={error}/>;
  return <>
    <div className="page-head"><div><h1>Approval Inbox</h1><p>Review submitted tasks, leave requests and daily work from one focused queue.</p></div><Button onClick={load}><RefreshCw/>Refresh</Button></div>
    <div className="grid cols-3 approval-summary">
      <div className="card stat"><div className="stat-icon"><ListTodo/></div><div><span>Task reviews</span><strong>{data.tasks.length}</strong><small>Submitted tasks</small></div></div>
      <div className="card stat"><div className="stat-icon i1"><Plane/></div><div><span>Leave requests</span><strong>{data.leaves.length}</strong><small>Pending approval</small></div></div>
      <div className="card stat"><div className="stat-icon i2"><Clock3/></div><div><span>Daily updates</span><strong>{data.dailyWork.length}</strong><small>Submitted today</small></div></div>
    </div>
    {!data.total?<Empty title="All clear" text="No pending approvals are waiting right now."/>:<div className="approval-grid">
      <section className="card approval-panel"><div className="section-head"><div><h3>Task Reviews</h3><p>Submitted additional tasks</p></div></div>{data.tasks.length?data.tasks.map(x=><article className="approval-item" key={x._id}><div><div className="row wrap"><h4>{x.title}</h4><Badge tone={tones[x.priority]}>{x.priority}</Badge></div><p>{x.assignedTo?.name} - {x.project?.name||'No project'}</p><small>Progress {x.progress}%</small></div><div className="approval-actions"><Button variant="primary" onClick={()=>act(()=>api.post('/tasks/'+x._id+'/review',{decision:'approved',note:'Approved from approval inbox',points:1,quality:5,rating:5}),'Task approved')}><CheckCircle2/>Approve</Button><Button className="btn orange" onClick={()=>act(()=>api.post('/tasks/'+x._id+'/review',{decision:'rework',note:'Please update and resubmit'}),'Rework requested')}><RotateCcw/>Rework</Button></div></article>):<Empty title="No task reviews" text="Submitted tasks will appear here."/>}</section>
      <section className="card approval-panel"><div className="section-head"><div><h3>Leave Requests</h3><p>Employee leave approval</p></div></div>{data.leaves.length?data.leaves.map(x=><article className="approval-item" key={x._id}><div><div className="row wrap"><h4>{x.employee?.name}</h4><Badge>{x.type}</Badge></div><p>{x.fromDate} to {x.toDate}</p><small>{x.reason}</small></div><div className="approval-actions"><Button variant="primary" onClick={()=>act(()=>api.post('/leaves/'+x._id+'/review',{decision:'approved',note:'Approved'}),'Leave approved')}><CheckCircle2/>Approve</Button><Button onClick={()=>act(()=>api.post('/leaves/'+x._id+'/review',{decision:'rejected',note:'Rejected'}),'Leave rejected')}><XCircle/>Reject</Button></div></article>):<Empty title="No leave requests" text="Pending leaves will appear here."/>}</section>
      <section className="card approval-panel"><div className="section-head"><div><h3>Daily Work</h3><p>Submitted daily tasks</p></div></div>{data.dailyWork.length?data.dailyWork.map(x=><article className="approval-item" key={x._id}><div><div className="row wrap"><h4>{x.title}</h4><Badge tone={tones[x.priority]||'muted'}>{x.priority}</Badge></div><p>{x.employee?.name} - {x.department?.name}</p><small>{x.submissionNote||'No note added'} · {x.date}</small></div><div className="approval-actions"><Button variant="primary" onClick={()=>act(()=>api.post('/daily-work/tasks/'+x.workId+'/'+x._id+'/review',{decision:'approved',note:'Approved from approval inbox'}),'Daily task approved')}><CheckCircle2/>Approve</Button><Button className="btn orange" onClick={()=>act(()=>api.post('/daily-work/tasks/'+x.workId+'/'+x._id+'/review',{decision:'rework',note:'Please update and resubmit'}),'Rework requested')}><RotateCcw/>Rework</Button></div></article>):<Empty title="No daily updates" text="Submitted daily tasks will appear here."/>}</section>
    </div>}
  </>;
}