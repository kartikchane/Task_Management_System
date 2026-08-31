import {useCallback,useState} from 'react';
import api from '../api';
import {useRefresh} from '../hooks';
import {useAuth} from '../context';
import {Button,Modal,Field,Badge,Empty,Skeleton} from '../components/UI';
import {Plus,Search,Pencil,Trash2,BarChart3} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Users(){
  const {user}=useAuth();
  const [rows,setRows]=useState([]),[deps,setDeps]=useState([]),[managers,setManagers]=useState([]),[modal,setModal]=useState(false),[edit,setEdit]=useState(null),[score,setScore]=useState(null),[search,setSearch]=useState(''),[role,setRole]=useState('employee');
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return Promise.all([api.get('/users',{params:{search}}),api.get('/departments'),api.get('/users/managers')]).then(([a,b,c])=>{
      setRows(a.data);
      setDeps(b.data);
      setManagers(c.data);
    }).catch(e=>{
      setError(e.response?.data?.message||'Unable to load people');
      setRows([]);
    }).finally(()=>setLoading(false));
  },[search]);
  useRefresh(load);
  const save=async e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target));
    d.skills=d.skills?d.skills.split(',').map(x=>x.trim()).filter(Boolean):[];
    d.shift={name:d.shiftName||'',startTime:d.shiftStart||'',endTime:d.shiftEnd||''};delete d.shiftName;delete d.shiftStart;delete d.shiftEnd;
    try{
      edit?await api.patch('/users/'+edit._id,d):await api.post('/users',d);
      toast.success('User saved');
      setModal(false);
      setEdit(null);
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to save');
    }
  };
  const del=async id=>{
    if(!confirm('Delete this user permanently?'))return;
    try{
      await api.delete('/users/'+id);
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to delete user');
    }
  };
  const openScore=async person=>{
    try{
      const {data}=await api.get('/users/'+person._id+'/scorecard');
      setScore(data);
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to load scorecard');
    }
  };
  return <>
    <div className="page-head"><div><h1>People</h1><p>{user.role==='admin'?'Manage employees reporting to you.':'Manage admins, managers and employees with reporting access.'}</p></div><Button variant="primary" onClick={()=>{setEdit(null);setRole('employee');setModal(true)}}><Plus/>Add person</Button></div>
    <div className="toolbar card"><div className="search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email"/></div><span>{rows.length} people</span></div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load people" text={error}/>:rows.length?<div className="table-wrap card"><table><thead><tr><th>Person</th><th>Employee ID</th><th>Department</th><th>Manager</th><th>Designation</th><th>Shift</th><th>Status</th><th/></tr></thead><tbody>{rows.map(x=><tr key={x._id}><td><div className="person"><div className="avatar">{x.name[0]}</div><div><b>{x.name}</b><span>{x.email}</span></div></div></td><td>{x.employeeCode||'-'}</td><td>{x.department?.name||'Global'}</td><td>{x.role==='employee'?x.manager?.name||'Not assigned':x.role==='admin'?'Team lead':'-'}</td><td>{x.designation||'-'}</td><td>{x.shift?.name||'-'}{x.shift?.startTime&&<small> {x.shift.startTime}-{x.shift.endTime}</small>}</td><td><Badge tone={x.status==='active'?'green':'orange'}>{x.status}</Badge></td><td><div className="actions"><button title="Scorecard" onClick={()=>openScore(x)}><BarChart3/></button><button title="Edit" onClick={()=>{setEdit(x);setRole(x.role||'employee');setModal(true)}}><Pencil/></button>{user.role==='superadmin'&&x.role!=='superadmin'&&<button title="Delete" onClick={()=>del(x._id)}><Trash2/></button>}</div></td></tr>)}</tbody></table></div>:<Empty title="No people found" text="People matching your search will appear here."/>}
    {score&&<Modal title={`${score.user.name} scorecard`} onClose={()=>setScore(null)} wide><div className="scorecard"><div className="score-hero"><div><p className="eyebrow">Performance score</p><h2>{score.score}/100</h2><p>{score.user.designation||score.user.role} - {score.user.department?.name||'Global'}</p></div><div className="score-ring" style={{'--score':score.score}}>{score.score}</div></div><div className="grid cols-4"><div className="card stat"><div><span>Approval rate</span><strong>{score.approvalRate}%</strong><small>{score.tasks.approved||0} approved</small></div></div><div className="card stat"><div><span>Punctuality</span><strong>{score.punctuality}%</strong><small>{score.attendance.total||0} records</small></div></div><div className="card stat"><div><span>Avg rating</span><strong>{score.avgRating}</strong><small>{score.points} points</small></div></div><div className="card stat"><div><span>Pending work</span><strong>{(score.tasks.todo||0)+(score.tasks['in-progress']||0)+(score.tasks.submitted||0)}</strong><small>{score.tasks.total||0} total tasks</small></div></div></div><section className="card"><div className="section-head"><div><h3>Recent tasks</h3><p>Latest work by this person</p></div></div><div className="task-list">{score.recentTasks?.length?score.recentTasks.map(t=><div className="task-row" key={t._id}><div className="task-dot"/><div className="grow"><b>{t.title}</b><span>{new Date(t.updatedAt).toLocaleString('en-IN')}</span></div><Badge>{t.status}</Badge><small>{t.progress}%</small></div>):<Empty title="No task history" text="This person has no tasks yet."/>}</div></section></div></Modal>}
    {modal&&<Modal title={edit?'Edit person':'Add person'} onClose={()=>{setModal(false);setEdit(null);setRole('employee')}} wide><form onSubmit={save} className="form-grid two"><Field label="Full name"><input name="name" defaultValue={edit?.name} required/></Field><Field label="Email address"><input name="email" type="email" defaultValue={edit?.email} required disabled={!!edit}/></Field>{!edit&&<Field label="Temporary password"><input name="password" defaultValue="Password@123" minLength="8" required/></Field>}<Field label="Role"><select name="role" value={role} onChange={e=>setRole(e.target.value)} disabled={user.role==='admin'||edit?.role==='superadmin'}><option value="employee">Employee</option>{user.role==='superadmin'&&<option value="admin">Manager / Admin</option>}{edit?.role==='superadmin'&&<option value="superadmin">Super Admin</option>}</select></Field>{user.role==='superadmin'&&role==='admin'&&<div className="register-note span-2">Admin will create their own department after login.</div>}{user.role==='superadmin'&&role==='employee'&&<Field label="Reporting manager"><select name="manager" defaultValue={edit?.manager?._id||''} required><option value="">Select manager</option>{managers.map(m=><option value={m._id} key={m._id} disabled={!m.department}>{m.name} - {m.department?.name||'Create department first'}</option>)}</select></Field>}<Field label="Employee ID"><input name="employeeCode" defaultValue={edit?.employeeCode}/></Field><Field label="Designation"><input name="designation" defaultValue={edit?.designation}/></Field><Field label="Shift name"><input name="shiftName" defaultValue={edit?.shift?.name} placeholder="General shift"/></Field><Field label="Shift hours"><div className="row"><input name="shiftStart" type="time" defaultValue={edit?.shift?.startTime}/><input name="shiftEnd" type="time" defaultValue={edit?.shift?.endTime}/></div></Field><Field label="Skills (comma-separated)"><input name="skills" defaultValue={edit?.skills?.join(', ')}/></Field><Field label="Status"><select name="status" defaultValue={edit?.status||'active'} disabled={edit?.role==='superadmin'}><option value="active">Active</option><option value="blocked">Blocked</option></select></Field><div className="form-actions span-2"><Button type="button" onClick={()=>{setModal(false);setEdit(null);setRole('employee')}}>Cancel</Button><Button variant="primary">Save person</Button></div></form></Modal>}
  </>;
}
