import React, { useState, useEffect } from 'react';
import { socket } from '../socket.js';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';

export default function Game(props) {
	const [state, setState] = useState({
		category: '',
		word: '',
		oddone: '',
		stage: -1,
		creator: false,
		instructions: [],
		players: [],
		chosen: null,
		pick: null,
		votes: {},
		voted: [],
	});

	const navigate = useNavigate();

	useEffect(() => {
		socket.emit('game', '', (result) => {
			console.log(result);
			if (result.error) return navigate('/');
			setState({
				...state,
				category: result.category,
				word: result.word,
				oddone: result.oddone,
				stage: result.stage,
				creator: result.creator,
				instructions: result.instructions,
				players: result.players,
				chosen: result.chosen,
				votes: result.votes || {},
				voted: result.voted || [],
			});
		});

		socket.on('game', (result) => {
			console.log(result.players);
			setState({
				...state,
				category: result.category,
				word: result.word,
				oddone: result.oddone,
				stage: result.stage,
				creator: result.creator,
				instructions: result.instructions,
				players: result.players,
				chosen: result.chosen,
				votes: result.votes || {},
				voted: result.voted || [],
			});
		});
	}, []);

	const onNextAsk = () => {
		socket.emit('next-ask');
	};

	const onNextVote = () => {
		socket.emit('next-vote');
	};

	const onPickChange = (event) => {
		setState({
			...state,
			pick: event.target.value,
		});
	};

	const onStartVote = () => {
		socket.emit('start-vote');
	};

	const onInsertVote = () => {
		socket.emit('insert-vote', state.pick);
	};

	const getVoteSum = () => {
		if (!state.votes) return 0;
		return Object.values(state.votes).reduce((a, b) => a + b, 0);
	};

	const getStage = () => {
		console.log(state.stage);
		switch (state.stage) {
			case 0:
				return (
					<div className='flex flex-col justify-center items-center space-y-3'>
						<div>{state.oddone == socket.id ? `انت برا السالفة, الموضوع عن "${state.category}"` : `انت داخل السالفة, السالفة عن "${state.word}"`}</div>
						{state.creator && (
							<Button variant='outlined' onClick={onNextAsk}>
								التالي
							</Button>
						)}
					</div>
				);
			case 1:
				return (
					<div className='flex flex-col justify-center items-center space-y-3'>
						<div>
							{state.players.find((e) => e.id == state.instructions[0]).user} يقوم بسؤال {state.players.find((e) => e.id == state.instructions[1]).user}
						</div>
						{state.creator && (
							<Button variant='outlined' onClick={onNextAsk}>
								التالي
							</Button>
						)}
					</div>
				);
			case 2:
				return (
					<div className='flex flex-col justify-center items-center space-y-3'>
						{`يختار ${state.players.find((e) => e.id == state.chosen).user} ننتظر`}
						{state.creator && (
							<FormControl fullWidth>
								<InputLabel>اختر</InputLabel>
								<Select value={state.pick} onChange={onPickChange}>
									{state.players
										.filter((e) => e.id != state.chosen)
										.map(({ id, user }) => {
											return <MenuItem value={id}>{user}</MenuItem>;
										})}
								</Select>
							</FormControl>
						)}
						{state.creator && (
							<Button variant='outlined' onClick={onNextVote}>
								التالي
							</Button>
						)}
						{state.creator && (
							<Button variant='outlined' onClick={onStartVote}>
								صوت
							</Button>
						)}
					</div>
				);
			case 3:
				return (
					<div>
						وقت التصويت ({getVoteSum()}/{state.players.length})<br />
						{state.voted.includes(socket.id) && `قمت بالتصويت اتنظر`}
						<FormControl fullWidth>
							<InputLabel>اختر</InputLabel>
							<Select value={state.pick} onChange={onPickChange}>
								{state.players
									.filter((e) => e.id != socket.id)
									.map(({ id, user }) => {
										return <MenuItem value={id}>{user}</MenuItem>;
									})}
							</Select>
						</FormControl>
						<Button variant='outlined' onClick={onInsertVote} disabled={state.voted.includes(socket.id)}>
							صوت
						</Button>
					</div>
				);
			case 4:
				return (
					<div>
						{Object.entries(state.votes)
							.sort((a, b) => b[1] - a[1])
							.map(([player, votes]) => {
								return (
									<div>
										{state.players.find((e) => e.id == player).user} -- {votes}
									</div>
								);
							})}
						<div>الي برا السالفة: {state.players.find((e) => e.id == state.oddone).user}</div>
					</div>
				);
		}
	};

	return (
		<div className='w-full h-full fixed top-0 left-0 bg-gray-100 flex justify-center items-center'>
			<div style={{ direction: 'rtl' }}>{getStage()}</div>
		</div>
	);
}
