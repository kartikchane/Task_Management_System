import {useCallback,useState} from 'react';
import api from '../api';
import {Button,Badge,Empty,Field,Skeleton} from '../components/UI';
import {useRefresh} from '../hooks';
import {CalendarCheck2,RefreshCw,Save} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DailyTemplates(){
  const [rows,setRows]=useState([]),[deps,setDeps]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [f,setF]=useState({title:'',department:'',description:'',workingDays:[1,2,3,4,5,6]});
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return Promise.all([api.get('/daily-templates'),api.get('/departments')]).then(([a,b])=>{
      setRows(a.data);
      setDeps(b.data);
    }).catch(e=>{
      setError(e.response?.data?.message||'Unable to load daily templates');
      setRows([]);
    }).finally(()=>setLoading(false));
  },[]);
  useRefresh(load);
  const submit=async e=>{
    e.preventDefault();
    try{
      await api.post('/daily-templates',f);
      toast.success('Template created');
      setF({...f,title:'',description:''});
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to create template');
    }
  };
  const generate=async()=>{
    try{
      const r=await api.post('/daily-templates/generate',{});
      toast.success(r.data.message+' ('+r.data.created+')');
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to generate daily work');
    }
  };
  return <>
    <div className="page-head"><div><h1>Daily Task Templates</h1><p>Automatically generate mandatory daily work.</p></div><Button onClick={generate}><CalendarCheck2/>Generate Today</Button></div>
    <form className="card daily-form" onSubmit={submit}>
      <div className="form-grid two">
        <Field label="Title"><input required value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></Field>
        <Field label="Department"><select required value={f.department} onChange={e=>setF({...f,department:e.target.value})}><option value="">Select department</option>{deps.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></Field>
        <Field label="Description"><textarea value={f.description} onChange={e=>setF({...f,description:e.target.value})}/></Field>
      </div>
      <div className="form-actions"><Button variant="primary"><Save/>Create Template</Button></div>
    </form>
    <div className="toolbar card"><span>{rows.length} template{rows.length===1?'':'s'}</span><Button onClick={load}><RefreshCw/>Refresh</Button></div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load templates" text={error}/>:rows.length?<div className="grid cols-3">{rows.map(x=><article className="card project-card" key={x._id}><div className="project-top"><div className="project-icon"><CalendarCheck2/></div><Badge tone={x.active?'green':'muted'}>{x.active?'Active':'Inactive'}</Badge></div><h3>{x.title}</h3><p>{x.description||'No description'}</p><div className="project-footer"><span>{x.department?.name||'No department'}</span><b>{x.assigneeMode||'department'}</b></div></article>)}</div>:<Empty title="No daily templates" text="Create a reusable daily task template to start automatic daily work generation."/>}
  </>;
}
