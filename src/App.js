import React, { useState, useRef } from 'react';
import { socket } from './socket.js';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';

export default function Home() {
	const [state, _setState] = useState({
		error: '',
		username: '',
		create: '',
		join: '',
		timeout: null,
	});

	const _state = useRef(state);
	const setState = (data) => {
		_state.current = data;
		_setState(data);
	};

	const navigate = useNavigate();

	const setError = (error) => {
		if (_state.current.timeout != null) clearTimeout(_state.current.timeout);
		console.log(error);
		setState({
			...state,
			error: error,
			timeout: setTimeout(() => {
				setState({
					..._state.current,
					error: '',
					timeout: null,
				});
			}, 3000),
		});
	};

	const onCreate = () => {
		if (state.username.trim() == '') {
			setError('Please enter a username');
			return;
		}

		console.log(socket);
		socket.emit('create', { room: state.create, user: state.username }, (result) => {
			if (result.error) {
				setError(result.message);
			} else {
				// router.push('/lobby', { scroll: false });
				navigate('/lobby');
			}
		});
	};

	const onJoin = () => {
		if (state.username.trim() == '') {
			setError('Please enter a username');
			return;
		}

		socket.emit('join', { room: state.join, user: state.username }, (result) => {
			if (result.error) {
				setError(result.message);
			} else {
				navigate('/lobby');
			}
		});
	};

	return (
		<div className='w-full h-full fixed top-0 left-0 bg-gray-100 flex justify-center items-center'>
			<div id='panel' className='w-[600px] h-fit flex flex-col space-y-3'>
				<TextField
					id='user'
					label='Username'
					variant='filled'
					onChange={(event) => {
						setState({
							...state,
							username: event.target.value,
						});
					}}
				/>
				<div className='w-full flex flex-row items-center justify-center h-fit space-x-3'>
					<TextField
						className='w-full'
						label='Create room'
						variant='filled'
						onChange={(event) => {
							setState({
								...state,

								create: event.target.value,
							});
						}}
					/>
					<Button variant='outlined' onClick={onCreate}>
						Submit
					</Button>
				</div>
				<div className='w-full flex flex-row items-center justify-center h-fit space-x-3'>
					<TextField
						className='w-full'
						label='Join room'
						variant='filled'
						onChange={(event) => {
							setState({
								...state,

								join: event.target.value,
							});
						}}
					/>
					<Button variant='outlined' onClick={onJoin}>
						Submit
					</Button>
				</div>
				<div className='text-red-500 w-full break-words'>{state.error}</div>
			</div>
		</div>
	);
}
