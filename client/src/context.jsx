import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {io} from 'socket.io-client';
import toast from 'react-hot-toast';
import api,{API_URL} from './api';

const C=createContext(null);
const refresh=()=>window.dispatchEvent(new Event('tf-refresh'));

export function AuthProvider({children}){
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem('tf_user')||'null'));
  const [ready,setReady]=useState(false);

  const login=async(identifier,password)=>{
    const {data}=await api.post('/auth/login',{identifier,password});
    localStorage.setItem('tf_token',data.token);
    localStorage.setItem('tf_user',JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout=()=>{
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    setUser(null);
  };

  useEffect(()=>{
    const token=localStorage.getItem('tf_token');
    if(!token){
      setReady(true);
      return;
    }
    api.get('/auth/me')
      .then(({data})=>{
        setUser(data);
        localStorage.setItem('tf_user',JSON.stringify(data));
      })
      .catch(logout)
      .finally(()=>setReady(true));
  },[]);

  useEffect(()=>{
    if(!user)return;
    const socket=io(API_URL.replace('/api',''),{
      auth:{
        token:localStorage.getItem('tf_token'),
        department:user.department?.id||user.department?._id
      }
    });

    const refreshOnly=[
      'notification:read',
      'dashboard:updated',
      'user:updated',
      'department:updated',
      'project:updated',
      'attendance:updated',
      'leave:updated',
      'daily-work:updated',
      'daily-work:generated',
      'daily-template:updated',
      'calendar:updated',
      'settings:updated'
    ];

    socket.on('notification',n=>{
      toast(`${n.title}: ${n.message}`);
      refresh();
    });
    socket.on('task:updated',refresh);
    socket.on('task:submitted',()=>{
      toast('A task was submitted for review');
      refresh();
    });
    socket.on('daily-work:submitted',()=>{
      toast('Daily work submitted for review');
      refresh();
    });
    refreshOnly.forEach(event=>socket.on(event,refresh));

    return()=>socket.disconnect();
  },[user]);

  const value=useMemo(()=>({user,setUser,login,logout,ready}),[user,ready]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useAuth=()=>useContext(C);
