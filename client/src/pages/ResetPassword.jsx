import {useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import api from '../api';
import {ArrowRight,CheckCircle2,KeyRound,Sparkles} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPassword(){
  const [params]=useSearchParams(),nav=useNavigate();
  const [token,setToken]=useState(params.get('token')||''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false);
  const submit=async e=>{
    e.preventDefault();
    if(password!==confirm)return toast.error('Passwords do not match');
    setBusy(true);
    try{
      await api.post('/auth/reset-password',{token,password});
      toast.success('Password reset successful');
      nav('/login');
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to reset password');
    }finally{
      setBusy(false);
    }
  };
  return <div className="login-page">
    <section className="login-hero"><div className="brand light"><img className="brand-logo" src="/gauri-aqua-plast-logo.svg" alt="Gauri Aqua Plast"/><b>Ganesh Gauri Industries</b></div><div><span className="pill"><Sparkles size={15}/> Account recovery</span><h1>Reset access.<br/>Return to work.<br/>Stay secure.</h1><p>Create a new password for your organization workspace using your secure reset token.</p><div className="hero-points"><span><CheckCircle2/>Token protected</span><span><CheckCircle2/>One-time use</span><span><CheckCircle2/>Expires automatically</span></div></div><small>Ganesh Gauri Industries - Secure by design</small></section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}>
      <div className="login-icon"><KeyRound/></div>
      <h2>Reset password</h2>
      <p>Enter the reset token and choose a new password.</p>
      <label>Reset token<input value={token} onChange={e=>setToken(e.target.value)} required/></label>
      <label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="8" required/></label>
      <label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength="8" required/></label>
      <button className="btn primary full" disabled={busy}>{busy?'Resetting...':'Reset password'}<ArrowRight size={18}/></button>
      <p className="muted"><Link to="/login">Back to sign in</Link></p>
    </form></section>
  </div>;
}
