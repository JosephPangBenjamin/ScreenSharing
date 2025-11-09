import React from 'react'
import ReactDOM from 'react-dom/client'
import App1 from "./App1.tsx";
import VideoConference from './components/VideoConference';
// import './index.scss'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VideoConference />
  </React.StrictMode>,
)