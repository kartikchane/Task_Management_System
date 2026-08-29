import {useEffect,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import api from '../api';
import {useAuth} from '../context';
import {ArrowRight,CheckCircle2,KeyRound,ShieldCheck,Sparkles,UserPlus,LockKeyhole,Building2} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login(){
  const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[deps,setDeps]=useState([]),[depsLoading,setDepsLoading]=useState(false),[depsError,setDepsError]=useState(false);
  const [form,setForm]=useState({name:'',emailOrPhone:'',password:'',role:'employee',department:'',designation:''});
  const {login,setUser}=useAuth(),nav=useNavigate();
  useEffect(()=>{
    if(mode!=='register'||form.role!=='employee')return;
    setDepsLoading(true);setDepsError(false);
    api.get('/auth/departments').then(r=>setDeps(r.data)).catch(()=>{setDeps([]);setDepsError(true)}).finally(()=>setDepsLoading(false));
  },[mode,form.role]);
  const patch=k=>e=>setForm({...form,[k]:e.target.value});
  const patchRole=e=>setForm({...form,role:e.target.value,department:e.target.value==='admin'?'':form.department});
  const switchMode=next=>{
    setMode(next);
    if(next==='register')setForm({...form,name:'',emailOrPhone:'',password:'',role:'employee',department:'',designation:''});
    if(next==='login')setForm({...form,emailOrPhone:'',password:''});
  };
  const getSubmitData=()=>{
    const val=form.emailOrPhone.trim();
    const isEmail=val.includes('@');
    return isEmail?{...form,email:val,phone:''}:{...form,email:'',phone:val};
  };
  const submit=async e=>{
    e.preventDefault();
    setBusy(true);
    try{
      if(mode==='reset'){
        await api.post('/auth/forgot-password',{email:form.emailOrPhone});
        toast.success('Reset link sent to email.');
      }else if(mode==='register'){
        const data=getSubmitData();
        const {data:res}=await api.post('/auth/register',data);
        localStorage.setItem('tf_token',res.token);
        localStorage.setItem('tf_user',JSON.stringify(res.user));
        setUser(res.user);
        toast.success(`${res.user.role==='admin'?'Admin':'Employee'} account registered`);
        nav('/');
      }else{
        await login(form.emailOrPhone,form.password);
        nav('/');
      }
    }catch(e){
      toast.error(e.response?.data?.message||(mode==='reset'?'Reset request failed':mode==='register'?'Registration failed':'Login failed'));
    }finally{
      setBusy(false);
    }
  };
  return <div className="login-page">
    <section className="login-hero"><div className="brand light"><img className="brand-logo" src="/gauri-aqua-plast-logo.svg" alt="Gauri Aqua Plast"/><b>Ganesh Gauri Industries</b></div><div><span className="pill"><Sparkles size={15}/> Modern workforce operations</span><h1>Plan work.<br/>Deliver faster.<br/>Lead with clarity.</h1><p>One secure workspace for departments, projects, tasks, approvals and live operational insight.</p><div className="hero-points"><span><CheckCircle2/>Role-based access</span><span><CheckCircle2/>Real-time updates</span><span><CheckCircle2/>Complete audit trail</span></div></div><small>Ganesh Gauri Industries - Secure by design</small></section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}>
      <div className="login-card-top">
        <div className="login-icon">{mode==='register'?<UserPlus/>:mode==='reset'?<KeyRound/>:<ShieldCheck/>}</div>
        <span className="secure-chip"><LockKeyhole size={14}/>Secured access</span>
      </div>
      <h2>{mode==='register'?'Create account':mode==='reset'?'Reset password':'Welcome back'}</h2>
      <p>{mode==='register'?'Admins create their own department after signup. Employees join an existing department.':mode==='reset'?'Enter your account email to generate a reset link.':'Sign in with your registered mobile number and password'}</p>
      {mode==='register'&&<label>Full name<input value={form.name} onChange={patch('name')} required/></label>}
      {mode==='register'&&<label>Email or Phone<input type="text" value={form.emailOrPhone} onChange={patch('emailOrPhone')} placeholder="Email address or 10-digit phone number" required/></label>}
      {mode==='login'&&<label>Email or mobile number<input type="text" value={form.emailOrPhone} onChange={patch('emailOrPhone')} placeholder="Email or 10 digit mobile number" required/></label>}
      {mode==='reset'&&<label>Email<input type="email" value={form.emailOrPhone} onChange={patch('emailOrPhone')} required/></label>}
      {mode!=='reset'&&<label>Password<input type="password" value={form.password} onChange={patch('password')} minLength="8" required/></label>}
      {mode==='register'&&<>
        <label>Register as<select value={form.role} onChange={patchRole}><option value="employee">Employee</option><option value="admin">Admin</option></select></label>
        {form.role==='employee'&&<label>Department<select value={form.department} onChange={patch('department')} required><option value="">{depsLoading?'Loading departments...':depsError?'Unable to load departments':deps.length?'Select department':'No active departments available'}</option>{deps.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></label>}
        {form.role==='admin'&&<div className="register-note"><Building2 size={17}/><span>You will create your department after login.</span></div>}
        <label>Designation<input value={form.designation} onChange={patch('designation')} placeholder={form.role==='admin'?'Manager':'Employee'}/></label>
      </>}
      <button className="btn primary full" disabled={busy}>{busy?(mode==='register'?'Creating...':mode==='reset'?'Generating...':'Signing in...'):(mode==='register'?'Create account':mode==='reset'?'Generate reset link':'Sign in')}<ArrowRight size={18}/></button>
      <div className="auth-switch">{mode==='register'&&<button type="button" onClick={()=>switchMode('login')}>Back to sign in</button>}<button type="button" className={mode==='register'?'active':''} onClick={()=>switchMode('register')}>Register</button><button type="button" className={mode==='reset'?'active':''} onClick={()=>setMode('reset')}>Forgot password</button></div>
      <div className="login-assurance"><span><Building2 size={15}/>Enterprise workspace</span><span><CheckCircle2 size={15}/>Live operations</span></div>
      {mode==='reset'&&<p className="muted">Already have a token? <Link to="/reset-password">Open reset page</Link></p>}
    </form></section>
  </div>;
}
