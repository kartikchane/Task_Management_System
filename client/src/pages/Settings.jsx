import {useCallback,useState} from 'react';
import api from '../api';
import {useRefresh} from '../hooks';
import {Button,Field,Skeleton,Empty} from '../components/UI';
import toast from 'react-hot-toast';

export default function Settings(){
  const [d,setD]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return api.get('/settings').then(r=>setD(r.data)).catch(e=>{
      setError(e.response?.data?.message||'Unable to load settings');
      setD(null);
    }).finally(()=>setLoading(false));
  },[]);
  useRefresh(load);
  const save=async e=>{
    e.preventDefault();
    const x=Object.fromEntries(new FormData(e.target));
    try{
      await api.put('/settings',x);
      toast.success('Organization settings saved');
      load();
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to save settings');
    }
  };
  if(loading)return <Skeleton/>;
  if(error)return <Empty title="Unable to load settings" text={error}/>;
  return <>
    <div className="page-head"><div><h1>Organization Settings</h1><p>Global configuration available only to Super Admin.</p></div></div>
    <form className="card settings-form" onSubmit={save}><h3>Company information</h3><Field label="Company name"><input name="companyName" defaultValue={d?.companyName}/></Field><Field label="Timezone"><select name="timezone" defaultValue={d?.timezone}><option>Asia/Kolkata</option><option>UTC</option></select></Field><Field label="Support email"><input name="supportEmail" type="email" defaultValue={d?.supportEmail||''}/></Field><Field label="Task reminder hours"><input name="reminderHours" type="number" min="1" defaultValue={d?.reminderHours||24}/></Field><div className="form-actions"><Button variant="primary">Save settings</Button></div></form>
  </>;
}
