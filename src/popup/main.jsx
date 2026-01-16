import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './Popup'

// Тут ми просто кажемо React-у: "Візьми керування над елементом 'root' і намалюй там Popup"
ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>,
)