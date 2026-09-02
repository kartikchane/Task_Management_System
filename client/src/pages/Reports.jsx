import {useCallback,useMemo,useState} from 'react';
import {Bar,BarChart,CartesianGrid,Cell,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {AlertTriangle,Download,FileSpreadsheet,Printer,RefreshCw} from 'lucide-react';
import api from '../api';
import {Button,Empty,Skeleton} from '../components/UI';
import {useRefresh} from '../hooks';
import {useAuth} from '../context';
import toast from 'react-hot-toast';

const statuses=['todo','in-progress','submitted','approved','rework'];
const statusTone={todo:'#94a3b8','in-progress':'#4169d8','submitted':'#8b5cf6','approved':'#16a085','rework':'#f59e0b'};

export default function Reports(){
  const {user}=useAuth();
  const [data,setData]=useState(null),[deps,setDeps]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [filters,setFilters]=useState({department:'',status:'',from:'',to:''});
  const params=useMemo(()=>Object.fromEntries(Object.entries(filters).filter(([,v])=>v)),[filters]);
  const load=useCallback(()=>{
    setLoading(true);setError('');
    return Promise.all([api.get('/reports/summary',{params}),...(user.role==='superadmin'?[api.get('/departments')]:[])]).then(([summary,depRes])=>{
      setData(summary.data);
      if(depRes)setDeps(depRes.data);
    }).catch(e=>{
      setError(e.response?.data?.message||'Unable to load reports');
      setData(null);
    }).finally(()=>setLoading(false));
  },[params,user.role]);
  useRefresh(load);
  const exportCsv=()=>{
    if(!data)return;
    const rows=[['Employee','Completed','Average Rating'],...data.productivity.map(x=>[x.name,x.completed,x.avgRating||0])];
    const csv=rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n');
    downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8;'}),'taskflow-daily-work-productivity.csv');
  };
  const exportExcel=async()=>{
    try{
      const r=await api.get('/reports/export',{params,responseType:'blob'});
      downloadBlob(r.data,'taskflow-report.xlsx');
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to export Excel');
    }
  };
  const printPdf=()=>window.print();
  return <>
    <div className="page-head"><div><h1>Reports & Analytics</h1><p>Operational insight generated from live Daily Work records.</p></div><div className="actions"><Button onClick={exportCsv}><Download/>CSV</Button><Button onClick={exportExcel}><FileSpreadsheet/>Excel</Button><Button onClick={printPdf}><Printer/>PDF</Button></div></div>
    <div className="toolbar card">
      {user.role==='superadmin'&&<select value={filters.department} onChange={e=>setFilters({...filters,department:e.target.value})}><option value="">All departments</option>{deps.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select>}
      <select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All statuses</option>{statuses.map(x=><option key={x} value={x}>{x.replace('-',' ')}</option>)}</select>
      <input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/>
      <input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/>
      <Button onClick={load}><RefreshCw/>Refresh</Button>
    </div>
    {loading?<Skeleton/>:error?<Empty title="Unable to load reports" text={error}/>:!data?<Empty title="No report data" text="Report data will appear here."/>:<div className="report-print">
      <div className="grid cols-3">
        <div className="stat card"><div className="stat-icon"><AlertTriangle/></div><div><span>Overdue daily tasks</span><strong>{data.overdue}</strong><small>Needs attention</small></div></div>
        <div className="stat card"><div><span>Status groups</span><strong>{data.byStatus.length}</strong><small>Current workflow</small></div></div>
        <div className="stat card"><div><span>Top contributors</span><strong>{data.productivity.length}</strong><small>Approved work</small></div></div>
      </div>
      <div className="grid reports-grid">
        <section className="card chart-card"><div className="section-head"><div><h3>Daily tasks by status</h3><p>Workflow distribution</p></div></div>{data.byStatus.length?<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={data.byStatus} dataKey="count" nameKey="_id" innerRadius={70} outerRadius={105} paddingAngle={4}>{data.byStatus.map((x,i)=><Cell key={i} fill={statusTone[x._id]||'#94a3b8'}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>:<Empty title="No status data" text="No daily tasks match the selected filters."/>}</section>
        <section className="card chart-card"><div className="section-head"><div><h3>Top contributors</h3><p>Approved daily tasks per employee</p></div></div>{data.productivity.length?<ResponsiveContainer width="100%" height={300}><BarChart data={data.productivity}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="completed" fill="#635bff" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer>:<Empty title="No productivity data" text="Approved daily tasks will appear here."/>}</section>
      </div>
    </div>}
  </>;
}

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}