import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, MailCheck, RefreshCw, Send } from 'lucide-react';
import { api } from './api';
import { useStore } from './context';

export function AdminIntegrations() {
  const {user}=useStore();
  const [state,setState]=useState(null);
  const [busy,setBusy]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    api('/admin/integrations').then(result=>{if(active)setState(result);})
      .catch(err=>{if(active)setError(err.message);});
    return()=>{active=false;};
  },[]);
  async function run(mode){
    setBusy(mode);setError('');setNotice('');
    try{
      const endpoint=mode==='verify'?'/admin/integrations/verify-smtp':'/admin/integrations/test-email';
      const result=await api(endpoint,{method:'POST'});
      if(mode==='verify'){
        setNotice(result.connected?'SMTP server connection verified.':'SMTP connection failed. Check the server logs and SMTP credentials.');
        if(!result.connected)setError('Could not authenticate with the configured SMTP provider.');
      }else{
        setNotice(result.message||'SMTP accepted the test email. Check your inbox.');
      }
    }catch(err){setError(err.message);}
    finally{setBusy('');}
  }
  return <section className="admin-panel admin-email-panel">
    <div className="admin-email-heading"><div><span className="eyebrow">COMMUNICATIONS & SIGN-IN</span><h2>Connected services</h2><p>Check your transactional email and Google sign-in setup without exposing credentials.</p></div><MailCheck size={25}/></div>
    {state?<div className="admin-email-integration-grid">
      <div className="admin-email-service">
        <div><strong>Transactional SMTP</strong>{state.smtp.configured?<span className="admin-email-good"><CheckCircle2 size={15}/> Configured</span>:<span className="admin-email-warning"><CircleAlert size={15}/> Setup required</span>}</div>
        <p>{state.smtp.configured?'SMTP environment values are present. Verify login and send a message to confirm.':'Missing environment fields: '+state.smtp.missing.join(', ')}</p>
      </div>
      <div className="admin-email-service">
        <div><strong>Google sign-in (API)</strong>{state.google.configured?<span className="admin-email-good"><CheckCircle2 size={15}/> Configured</span>:<span className="admin-email-warning"><CircleAlert size={15}/> Setup required</span>}</div>
        <p>Google Client ID must also be set in the React frontend, with the authorized JavaScript origin in Google Cloud.</p>
      </div>
    </div>:<p className="muted-note">Loading integration status…</p>}
    <div className="admin-email-actions">
      <button type="button" className="button button-outline" disabled={busy!==''||!state?.smtp?.configured} onClick={()=>run('verify')}><RefreshCw size={16}/> {busy==='verify'?'Checking…':'Verify SMTP connection'}</button>
      <button type="button" className="button button-dark" disabled={busy!==''||!state?.smtp?.configured} onClick={()=>run('test')}><Send size={16}/> {busy==='test'?'Sending…':'Send test email'}</button>
    </div>
    <p className="muted-note">Test email recipient: <strong>{user?.email}</strong>. A successful send means SMTP accepted the message, not that the inbox delivered it.</p>
    {notice&&<p className="admin-email-success" role="status">{notice}</p>}
    {error&&<p className="admin-email-error" role="alert">{error}</p>}
    <p className="muted-note">Transactional messages: registration welcome, password reset and security notice, order confirmation, status, payment and courier tracking. SMTP failures do not cancel a valid order.</p>
  </section>;
}
