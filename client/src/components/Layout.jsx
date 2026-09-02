import {NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {LayoutDashboard,Building2,Users,FolderKanban,ListTodo,CalendarCheck2,CalendarDays,Clock3,Plane,ClipboardList,ClipboardCheck,ShieldCheck,BarChart3,Bell,Settings,LogOut,Menu,X,UserCircle,Search,ClipboardEdit} from 'lucide-react';
import {useAuth} from '../context';
import {useCallback,useEffect,useRef,useState} from 'react';
import api from '../api';
import {Modal,Badge,Button} from './UI';

const links=[
  ['/','Dashboard',LayoutDashboard],
  ['/departments','Departments',Building2,['superadmin','admin']],
  ['/users','People',Users,['superadmin','admin']],
  ['/projects','Projects',FolderKanban],
  ['/daily-work','Daily Work',CalendarCheck2],
  ['/daily-templates','Daily Templates',ClipboardList,['superadmin','admin']],
  ['/approvals','Approvals',ClipboardCheck,['superadmin','admin']],
  ['/attendance','Attendance',Clock3],
  ['/leave','Leave',Plane],
  ['/calendar','Calendar',CalendarDays],
  ['/tasks','Additional Tasks',ListTodo],
  ['/reports','Reports',BarChart3,['superadmin','admin']],
  ['/notifications','Notifications',Bell],
  ['/audit','Audit Logs',ShieldCheck,['superadmin']],
  ['/settings','Settings',Settings,['superadmin']]
];

export default function Layout(){
  const {user,logout}=useAuth();
  const navigate=useNavigate();
  const [open,setOpen]=useState(false);
  const [unread,setUnread]=useState(0);
  const [assignPopup,setAssignPopup]=useState([]);
  const seenIds=useRef(new Set());
  const location=useLocation();
  const title=links.find(x=>x[0]===location.pathname)?.[1]||'Ganesh Gauri Industries';
  const loadUnread=useCallback(()=>Promise.all([
    api.get('/notifications').then(({data})=>setUnread(data.filter(x=>!x.read).length)),
    api.get('/notifications/pending-assignments').then(({data})=>{
      const fresh=data.filter(x=>!seenIds.current.has(x._id));
      if(fresh.length){
        fresh.forEach(x=>seenIds.current.add(x._id));
        setAssignPopup(prev=>[...fresh,...prev]);
      }
    }),
  ]).catch(err=>console.error('Failed to load notifications',err)),[]);
  useEffect(()=>{
    loadUnread();
    window.addEventListener('tf-refresh',loadUnread);
    return()=>window.removeEventListener('tf-refresh',loadUnread);
  },[loadUnread]);
  const dismissAssignPopup=()=>{
    const ids=assignPopup.map(x=>x._id);
    setAssignPopup([]);
    Promise.all(ids.map(id=>api.patch('/notifications/'+id+'/read'))).then(loadUnread).catch(()=>{});
  };
  const openAssignItem=x=>{
    setAssignPopup(prev=>prev.filter(y=>y._id!==x._id));
    api.patch('/notifications/'+x._id+'/read').then(loadUnread).catch(()=>{});
    navigate(x.link||'/notifications');
  };
  return <div className="app-shell">
    {open&&<button className="shell-backdrop mobile" aria-label="Close menu" onClick={()=>setOpen(false)}/>}
    <aside className={'sidebar '+(open?'open':'')}>
      <div className="brand">
        <img className="brand-logo" src="/gauri-aqua-plast-logo.svg" alt="Gauri Aqua Plast"/>
        <div><b>Ganesh Gauri</b><span>Industries</span></div>
        <button className="icon mobile" onClick={()=>setOpen(false)}><X/></button>
      </div>
      <nav>{links.filter(x=>!x[3]||x[3].includes(user.role)).map(([to,label,Icon])=><NavLink end={to==='/'} key={to} to={to} onClick={()=>setOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-user">
        <div className="user-row">
          <div className="avatar">{user.name[0]}</div>
          <div><b>{user.name}</b><span>{user.role.replace('superadmin','Super Admin')}</span></div>
        </div>
        <button onClick={logout} className="logout-btn"><LogOut size={18}/><span>Logout</span></button>
      </div>
    </aside>
    <main>
      <header>
        <button className="icon mobile" onClick={()=>setOpen(true)}><Menu/></button>
        <div><p className="eyebrow">Workspace</p><h2>{title}</h2></div>
        <div className="header-actions">
          <div className="search"><Search size={17}/><input placeholder="Search workspace..."/></div>
          <NavLink className="icon notif-button" to="/notifications"><Bell size={20}/>{unread>0&&<span className="notif-badge">{unread>9?'9+':unread}</span>}</NavLink>
          <NavLink className="profile-chip" to="/profile"><UserCircle size={22}/><span>{user.name.split(' ')[0]}</span></NavLink>
        </div>
      </header>
      <div className="page"><Outlet/></div>
    </main>
    {assignPopup.length>0&&(
      <Modal title="Tasks needing your attention" onClose={dismissAssignPopup}>
        <div className="form-grid">
          <p className="muted">You have {assignPopup.length} item{assignPopup.length>1?'s':''} that need action.</p>
          <div className="stack-fields">
            {assignPopup.map(x=>(
              <article key={x._id} className="task-card" onClick={()=>openAssignItem(x)}>
                <div className="row wrap">
                  <Badge tone={x.type.startsWith('daily')?'purple':'blue'}>{x.type.startsWith('daily')?'Daily Work':'Additional Task'}</Badge>
                  {x.type.endsWith('rework')&&<Badge tone="orange">Needs changes</Badge>}
                </div>
                <h3>{x.title}</h3>
                <p>{x.message}</p>
              </article>
            ))}
          </div>
          <div className="form-actions">
            <Button variant="primary full" onClick={dismissAssignPopup}><ClipboardEdit/>Got it, close for now</Button>
          </div>
          <p className="muted" style={{fontSize:'.8rem',textAlign:'center'}}>This will keep showing on login until the task is submitted.</p>
        </div>
      </Modal>
    )}
  </div>;
}