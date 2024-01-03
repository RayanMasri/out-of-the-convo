import React, { useState, useEffect, useRef } from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Button from '@mui/material/Button';
import { socket } from '../socket.js';
import { useNavigate } from 'react-router-dom';
import data from '../data.json';
import './Page.css';

export default function Lobby() {
	const [state, _setState] = useState({
		users: [],
		category: 0,
		creator: false,
		id: '',
	});
	const _state = useRef(state);
	const setState = (data) => {
		_state.current = data;
		_setState(data);
	};

	const navigate = useNavigate();

	const onStart = () => {
		socket.emit('start', { category: state.category }, (result) => {
			if (!result.error) {
				navigate('/game');
			}
		});
	};

	const onCategoryChange = (event) => {
		setState({
			...state,
			category: event.target.value,
		});
	};

	useEffect(() => {
		socket.emit('lobby', '', (result) => {
			if (result.error) {
				navigate('/');
				return;
			}

			setState({
				...state,
				users: result.users,
				creator: result.creator,
				id: result.id,
			});
		});

		socket.on('lobby', (result) => {
			setState({
				..._state.current,
				users: result.users,
			});

			if (result.users.length == 0) navigate('/');
		});

		socket.on('game', (result) => {
			navigate('/game');
		});
	}, []);

	return (
		<div className='w-full h-full fixed top-0 left-0 bg-gray-100 flex justify-center items-center'>
			<div id='panel' className='w-[600px] h-fit flex flex-col space-y-3'>
				{state.creator && (
					<FormControl fullWidth>
						<InputLabel>Category</InputLabel>
						<Select value={state.category} onChange={onCategoryChange}>
							{Object.keys(data).map((category, index) => {
								return <MenuItem value={index}>{category}</MenuItem>;
							})}
						</Select>
					</FormControl>
				)}
				{state.creator && <div className='h-[2px] w-full bg-black'>&nbsp;</div>}
				{!state.creator && <div>Waiting for room maker to start...</div>}
				<div>
					Users: {state.users.join(', ')} ({state.users.length})
				</div>
				{state.creator && (
					<Button variant='outlined' onClick={onStart} disabled={state.users.length <= 2}>
						Start
					</Button>
				)}
				ID: {state.id}
			</div>
		</div>
	);
}
// 'use client';
// import React, { useState, useRef } from 'react';
// import { socket } from './socket.js';
// import MenuItem from '@mui/material/MenuItem';
// import Select from '@mui/material/Select';

// export default function Home() {

// 	return (
// 		<div className='w-full h-full fixed top-0 left-0 bg-gray-100 flex justify-center items-center'>
// 			<div id='panel' className='w-[600px] h-fit flex flex-col space-y-3'>
// 				<Select value={''} label='Category' onChange={onCategoryChange}>
// 					{Object.keys(data).map((category, index) => {
// 						<MenuItem value={index}>{category}</MenuItem>;
// 					})}
// 				</Select>
// 				<Select value={''} label='Subject' onChange={onSubjectChange}>
// 					{data[Object.keys(data)[state.category]].map((subject, index) => {
// 						<MenuItem value={index}>{subject}</MenuItem>;
// 					})}
// 				</Select>
// 			</div>
// 		</div>
// 	);
// }
