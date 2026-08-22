import {useCallback,useState} from 'react';
import api from '../api';
import {Button,Empty,Skeleton} from '../components/UI';
import {useRefresh} from '../hooks';
import {RefreshCw} from 'lucide-react';

export default function Audit(){
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const details=x=>x.details?Object.entries(x.details).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join(' | '):'-';
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return api.get('/audit').then(r=>setRows(r.data)).catch(e=>{
      setError(e.response?.data?.message||'Unable to load audit logs');
      setRows([]);
    }).finally(()=>setLoading(false));
  },[]);
  useRefresh(load);
  return <>
    <div className="page-head"><div><h1>Audit Logs</h1><p>Immutable organization activity history.</p></div><Button onClick={load}><RefreshCw/>Refresh</Button></div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load audit logs" text={error}/>:rows.length?<div className="table-wrap card"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{rows.map(x=><tr key={x._id}><td>{new Date(x.createdAt).toLocaleString('en-IN')}</td><td><div className="person"><div className="avatar">{(x.actor?.name||'S')[0]}</div><div><b>{x.actor?.name||'System'}</b><span>{x.actor?.email||x.actor?.role||'-'}</span></div></div></td><td>{x.action}</td><td>{x.entityType}<br/><span className="muted">{x.entityId||''}</span></td><td>{details(x)}</td></tr>)}</tbody></table></div>:<Empty title="No audit logs" text="Organization activity will appear here."/>}
  </>;
}
