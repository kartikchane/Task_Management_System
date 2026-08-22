import {useCallback,useMemo,useState} from 'react';
import api from '../api';
import {Button,Badge,Empty,Skeleton} from '../components/UI';
import {useAuth} from '../context';
import {useRefresh} from '../hooks';
import {CalendarDays,Clock3,LogIn,LogOut,RefreshCw,Users} from 'lucide-react';
import toast from 'react-hot-toast';

const today=()=>new Date().toISOString().slice(0,10);
const tones={present:'green',late:'orange','half-day':'orange',absent:'red',leave:'purple',holiday:'blue'};

export default function Attendance(){
  const {user}=useAuth();
  return user.role==='employee'?<EmployeeAttendance/>:<ManagerAttendance/>;
}

function EmployeeAttendance(){
  const [x,setX]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return api.get('/attendance/today').then(r=>setX(r.data)).catch(e=>{
      setError(e.response?.data?.message||'Unable to load attendance');
      setX(null);
    }).finally(()=>setLoading(false));
  },[]);
  useRefresh(load);
  const act=async p=>{
    try{
      const {data}=await api.post('/attendance/'+p);
      setX(data);
      toast.success(p==='check-in'?'Checked in':'Checked out');
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Attendance action failed');
    }
  };
  return <>
    <div className="page-head"><div><h1>Attendance</h1><p>Track check-in, check-out and working hours.</p></div><div className="date-chip"><CalendarDays/>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div></div>
    {loading?<Skeleton/>:<section className="card daily-form">
      <div className="section-head"><div><h3>Today</h3><p>{error||'Your attendance record for the current working day.'}</p></div><Badge tone={tones[x?.status]}>{x?.status||'Not checked in'}</Badge></div>
      <div className="notice success"><Clock3/><div><b>Attendance policy</b><p>Check in and check out record your working time. Final attendance status is reviewed and marked by your manager.</p></div></div>
      <div className="form-grid two">
        <div><b>Check in</b><p>{x?.checkIn?new Date(x.checkIn).toLocaleTimeString('en-IN'):'-'}</p></div>
        <div><b>Check out</b><p>{x?.checkOut?new Date(x.checkOut).toLocaleTimeString('en-IN'):'-'}</p></div>
        <div><b>Worked</b><p>{x?.workedMinutes||0} min</p></div>
        <div><b>Date</b><p>{today()}</p></div>
      </div>
      <div className="form-actions">
        <Button variant="primary" onClick={()=>act('check-in')} disabled={!!x?.checkIn}><LogIn/>Check In</Button>
        <Button onClick={()=>act('check-out')} disabled={!x?.checkIn||!!x?.checkOut}><LogOut/>Check Out</Button>
      </div>
    </section>}
  </>;
}

function ManagerAttendance(){
  const [rows,setRows]=useState([]),[date,setDate]=useState(today()),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return api.get('/attendance',{params:{date}}).then(r=>setRows(r.data)).catch(e=>{
      setError(e.response?.data?.message||'Unable to load attendance records');
      setRows([]);
    }).finally(()=>setLoading(false));
  },[date]);
  useRefresh(load);
  const counts=useMemo(()=>({
    present:rows.filter(x=>x.status==='present').length,
    late:rows.filter(x=>x.status==='late').length,
    halfDay:rows.filter(x=>x.status==='half-day').length,
    leave:rows.filter(x=>x.status==='leave').length,
    total:rows.length
  }),[rows]);
  const mark=async(row,status)=>{
    try{
      const {data}=await api.patch('/attendance/'+row._id,{status,note:row.note||''});
      setRows(rows.map(x=>x._id===row._id?data:x));
      toast.success('Attendance status updated');
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to update attendance');
    }
  };
  return <>
    <div className="page-head"><div><h1>Attendance Monitor</h1><p>Review employee check-ins, check-outs and working minutes.</p></div></div>
    <div className="notice success"><Clock3/><div><b>Manual attendance review</b><p>System records check-in, check-out and worked minutes only. Managers mark late, half day, leave or absent as per company policy.</p></div></div>
    <div className="grid cols-4">
      <Mini icon={<Users/>} label="Records" value={counts.total}/>
      <Mini icon={<LogIn/>} label="Present" value={counts.present}/>
      <Mini icon={<Clock3/>} label="Half day" value={counts.halfDay}/>
      <Mini icon={<CalendarDays/>} label="Late / leave" value={counts.late+counts.leave}/>
    </div>
    <div className="toolbar card">
      <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      <Button onClick={load}><RefreshCw/>Refresh</Button>
    </div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load attendance" text={error}/>:rows.length?<div className="table-wrap card"><table><thead><tr><th>Employee</th><th>Date</th><th>Check in</th><th>Check out</th><th>Worked</th><th>Status</th><th>Manager action</th></tr></thead><tbody>{rows.map(x=><tr key={x._id}><td><div className="person"><div className="avatar">{x.employee?.name?.[0]||'?'}</div><div><b>{x.employee?.name||'Unknown employee'}</b><span>{x.employee?.designation||x.employee?.email||'Employee'}</span></div></div></td><td>{x.date}</td><td>{x.checkIn?new Date(x.checkIn).toLocaleTimeString('en-IN'):'-'}</td><td>{x.checkOut?new Date(x.checkOut).toLocaleTimeString('en-IN'):'-'}</td><td>{x.workedMinutes||0} min</td><td><Badge tone={tones[x.status]}>{x.status}</Badge></td><td><select className="inline-select" value={x.status} onChange={e=>mark(x,e.target.value)}><option value="present">Present</option><option value="late">Late</option><option value="half-day">Half day</option><option value="absent">Absent</option><option value="leave">Leave</option><option value="holiday">Holiday</option></select></td></tr>)}</tbody></table></div>:<Empty title="No attendance records" text="No employees have checked in for this date yet."/>}
  </>;
}

function Mini({icon,label,value}){return <div className="stat card"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>Attendance</small></div></div>}
