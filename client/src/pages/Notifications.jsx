import {useCallback,useState} from 'react';
import api from '../api';
import {useRefresh} from '../hooks';
import {Button,Empty,Badge,Skeleton} from '../components/UI';
import {Bell,CheckCheck} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Notifications(){
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return api.get('/notifications').then(r=>setRows(r.data)).catch(e=>{
      setError(e.response?.data?.message||'Unable to load notifications');
      setRows([]);
    }).finally(()=>setLoading(false));
  },[]);
  useRefresh(load);
  const all=async()=>{
    try{
      await api.patch('/notifications/read-all');
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to mark notifications read');
    }
  };
  const mark=async id=>{
    try{
      await api.patch('/notifications/'+id+'/read');
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to update notification');
    }
  };
  return <>
    <div className="page-head"><div><h1>Notifications</h1><p>Live assignments, submissions and review updates.</p></div><Button onClick={all}><CheckCheck/>Mark all read</Button></div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load notifications" text={error}/>:rows.length?<div className="card notification-list">{rows.map(x=><div className={'notification '+(!x.read?'unread':'')} key={x._id} onClick={()=>mark(x._id)}><div className="notif-icon"><Bell/></div><div className="grow"><div className="row"><b>{x.title}</b>{!x.read&&<Badge tone="blue">New</Badge>}</div><p>{x.message}</p><small>{new Date(x.createdAt).toLocaleString('en-IN')}</small></div></div>)}</div>:<Empty title="All caught up" text="You have no notifications right now."/>}
  </>;
}
