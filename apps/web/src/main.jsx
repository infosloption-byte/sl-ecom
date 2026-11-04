import React from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import { StoreProvider } from './context';
import App from './App';
import './styles.css';
import './enhancements.css';
import './responsive-pages.css';

const core = <BrowserRouter><StoreProvider><App/></StoreProvider></BrowserRouter>;
createRoot(document.getElementById('root')).render(<React.StrictMode>{import.meta.env.VITE_GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>{core}</GoogleOAuthProvider> : core}</React.StrictMode>);
