import {useCallback,useMemo,useState} from 'react';
import api from '../api';
import {useRefresh} from '../hooks';
import {useAuth} from '../context';
import {Button,Modal,Field,Badge,Empty,Skeleton} from '../components/UI';
import {Plus,FolderKanban,Calendar,Users,Search,RefreshCw,Pencil,Trash2} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Projects(){
  const {user}=useAuth();
  const [rows,setRows]=useState([]),[deps,setDeps]=useState([]),[people,setPeople]=useState([]),[modal,setModal]=useState(false),[edit,setEdit]=useState(null);
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return Promise.all([api.get('/projects'),...(user.role!=='employee'?[api.get('/departments'),api.get('/users')]:[])]).then(r=>{
      setRows(r[0].data);
      if(r[1])setDeps(r[1].data);
      if(r[2])setPeople(r[2].data);
    }).catch(e=>{
      setError(e.response?.data?.message||'Unable to load projects');
      setRows([]);
    }).finally(()=>setLoading(false));
  },[user.role]);
  useRefresh(load);
  const filtered=useMemo(()=>rows.filter(x=>(!status||x.status===status)&&(!search||`${x.name} ${x.code} ${x.description||''}`.toLowerCase().includes(search.toLowerCase()))),[rows,search,status]);
  const toDateInput=v=>v?new Date(v).toISOString().slice(0,10):'';
  const save=async e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target));
    d.members=[...e.target.querySelector('[name=members]').selectedOptions].map(o=>o.value);
    try{
      edit?await api.patch('/projects/'+edit._id,d):await api.post('/projects',d);
      toast.success(edit?'Project updated':'Project created');
      setModal(false);
      setEdit(null);
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to save project');
    }
  };
  const del=async id=>{
    if(!confirm('Delete this project? Tasks inside this project must be removed first.'))return;
    try{
      await api.delete('/projects/'+id);
      toast.success('Project deleted');
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to delete project');
    }
  };
  return <>
    <div className="page-head"><div><h1>Projects</h1><p>Track delivery, ownership, milestones and team allocation.</p></div>{user.role!=='employee'&&<Button variant="primary" onClick={()=>setModal(true)}><Plus/>New project</Button>}</div>
    <div className="toolbar card"><div className="search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects"/></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option>planning</option><option>active</option><option>on-hold</option><option>completed</option></select><Button onClick={load}><RefreshCw/>Refresh</Button></div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load projects" text={error}/>:filtered.length?<div className="grid cols-3">{filtered.map(x=><article className="card project-card" key={x._id}><div className="project-top"><div className="project-icon"><FolderKanban/></div><Badge tone={x.status==='active'?'green':x.status==='on-hold'?'orange':x.status==='completed'?'blue':'muted'}>{x.status}</Badge></div><h3>{x.name}</h3><p>{x.description||'No description'}</p><div className="project-meta"><span><Calendar/> {x.endDate?new Date(x.endDate).toLocaleDateString('en-IN'):'No deadline'}</span><span><Users/> {x.members?.length||0} members</span></div><div className="progress-head"><span>Progress</span><b>{x.progress}%</b></div><div className="progress"><i style={{width:x.progress+'%'}}/></div><div className="project-footer"><span>{x.department?.name}</span><b>{x.code}</b></div>{user.role!=='employee'&&<div className="card-actions"><button title="Edit project" onClick={()=>{setEdit(x);setModal(true)}}><Pencil/></button><button title="Delete project" onClick={()=>del(x._id)}><Trash2/></button></div>}</article>)}</div>:<Empty title="No projects found" text="Projects matching your filters will appear here."/>}
    {modal&&<Modal title={edit?'Edit project':'Create project'} onClose={()=>{setModal(false);setEdit(null)}} wide><form onSubmit={save} className="form-grid two"><Field label="Project name"><input name="name" defaultValue={edit?.name} required/></Field><Field label="Project code"><input name="code" defaultValue={edit?.code} required/></Field><Field label="Department"><select name="department" defaultValue={edit?.department?._id||''} required><option value="">Select department</option>{deps.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></Field><Field label="Manager"><select name="manager" defaultValue={edit?.manager?._id||''}><option value="">Select manager</option>{people.filter(x=>x.role!=='employee').map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></Field><Field label="Priority"><select name="priority" defaultValue={edit?.priority||'medium'}><option>medium</option><option>high</option><option>critical</option><option>low</option></select></Field><Field label="Status"><select name="status" defaultValue={edit?.status||'planning'}><option>planning</option><option>active</option><option>on-hold</option><option>completed</option></select></Field><Field label="Start date"><input type="date" name="startDate" defaultValue={toDateInput(edit?.startDate)}/></Field><Field label="End date"><input type="date" name="endDate" defaultValue={toDateInput(edit?.endDate)}/></Field><Field label="Members"><select multiple name="members" defaultValue={edit?.members?.map(x=>x._id)||[]}>{people.filter(x=>x.role==='employee').map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></Field><Field label="Description"><textarea name="description" defaultValue={edit?.description}/></Field><div className="form-actions span-2"><Button type="button" onClick={()=>{setModal(false);setEdit(null)}}>Cancel</Button><Button variant="primary">{edit?'Save project':'Create project'}</Button></div></form></Modal>}
  </>;
}
