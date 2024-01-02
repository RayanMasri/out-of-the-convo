// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import './index.css';
// import App from './App';

// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(<App />);

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.js';
import Lobby from './Lobby/Page.js';
import Game from './Game/Page.js';
import './index.css';

const router = createBrowserRouter([
	{
		path: '/',
		element: <App />,
		// errorElement: <Error/>
	},
	{
		path: '/lobby',
		element: <Lobby />,
		// errorElement: <Error/>
	},
	{
		path: '/game',
		element: <Game />,
		// errorElement: <Error/>
	},
]);

ReactDOM.createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);
