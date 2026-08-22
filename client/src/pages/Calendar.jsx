import {useCallback,useState} from 'react';
import api from '../api';
import {Empty,Skeleton} from '../components/UI';
import {useRefresh} from '../hooks';

function monthRange(){
  const now=new Date();
  return {
    from:new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10),
    to:new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10)
  };
}

export default function Calendar(){
  const [d,setD]=useState({tasks:[],leaves:[],holidays:[]}),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return api.get('/calendar',{params:monthRange()}).then(r=>setD(r.data)).catch(e=>{
      setError(e.response?.data?.message||'Unable to load calendar');
      setD({tasks:[],leaves:[],holidays:[]});
    }).finally(()=>setLoading(false));
  },[]);
  useRefresh(load);
  return <>
    <div className="page-head"><div><h1>Work Calendar</h1><p>Tasks, leave and holidays in one view.</p></div></div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load calendar" text={error}/>:<div className="grid cols-3">
      <section className="card daily-form"><h3>Task Deadlines</h3>{d.tasks.length?d.tasks.map(x=><p key={x._id}><b>{x.title}</b><br/>{new Date(x.dueDate).toLocaleDateString('en-IN')}</p>):<Empty title="No task deadlines" text="No task deadlines are scheduled this month."/>}</section>
      <section className="card daily-form"><h3>Approved Leave</h3>{d.leaves.length?d.leaves.map(x=><p key={x._id}>{x.employee?.name}: {x.fromDate} to {x.toDate}</p>):<Empty title="No approved leave" text="Approved leave will appear here."/>}</section>
      <section className="card daily-form"><h3>Holidays</h3>{d.holidays.length?d.holidays.map(x=><p key={x._id}><b>{x.name}</b><br/>{x.date}</p>):<Empty title="No holidays" text="No holidays are listed for this month."/>}</section>
    </div>}
  </>;
}
