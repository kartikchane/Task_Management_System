import {useState} from 'react';
import {useAuth} from '../context';
import api from '../api';
import {Button,Field} from '../components/UI';
import toast from 'react-hot-toast';

export default function Profile(){
  const {user,setUser}=useAuth();
  const [tab,setTab]=useState('profile');
  const save=async e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target));
    d.skills=d.skills.split(',').map(x=>x.trim()).filter(Boolean);
    try{
      const {data}=await api.patch('/auth/profile',d);
      setUser(data);
      localStorage.setItem('tf_user',JSON.stringify(data));
      toast.success('Profile updated');
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to update profile');
    }
  };
  const pass=async e=>{
    e.preventDefault();
    const d=Object.fromEntries(new FormData(e.target));
    try{
      await api.patch('/auth/password',d);
      e.target.reset();
      toast.success('Password changed');
    }catch(e){
      toast.error(e.response?.data?.message||'Unable to change password');
    }
  };
  return <>
    <div className="page-head"><div><h1>My Profile</h1><p>Manage personal information and account security.</p></div></div>
    <div className="profile-layout"><aside className="card profile-summary"><div className="avatar xl">{user.name[0]}</div><h2>{user.name}</h2><p>{user.designation||user.role}</p><span>{user.email}</span><button className={tab==='profile'?'active':''} onClick={()=>setTab('profile')}>Personal information</button><button className={tab==='security'?'active':''} onClick={()=>setTab('security')}>Security</button></aside><section className="card">{tab==='profile'?<form onSubmit={save} className="form-grid two"><h3 className="span-2">Personal information</h3><Field label="Full name"><input name="name" defaultValue={user.name}/></Field><Field label="Designation"><input name="designation" defaultValue={user.designation}/></Field><Field label="Phone"><input name="phone" defaultValue={user.phone}/></Field><Field label="Skills"><input name="skills" defaultValue={user.skills?.join(', ')}/></Field><div className="form-actions span-2"><Button variant="primary">Save changes</Button></div></form>:<form onSubmit={pass} className="form-grid"><h3>Change password</h3><Field label="Current password"><input type="password" name="currentPassword" required/></Field><Field label="New password"><input type="password" name="newPassword" minLength="8" required/></Field><div className="form-actions"><Button variant="primary">Update password</Button></div></form>}</section></div>
  </>;
}
