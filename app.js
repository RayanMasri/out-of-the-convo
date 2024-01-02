const { server, io } = require('./load.js');
const categories = require('./src/data.json');

const getSocketById = (id) => io.sockets.sockets.get(id);

let rooms = {};
let users = {};

let pending = [];
let recovery_period = 3000; // If the time of a connection to the latest disconnection is less than this, the user will be reconnected

// const abandonPlayerRoom = (socket) => {
// 	// Find user room
// 	let result = Object.entries(rooms).find(([id, room]) => room.players.includes(socket));
// 	if (result == undefined) return;

// 	let [id, room] = result;
// 	// Inform remaining players of disconnection
// 	console.log(`GAME-ACTIVITY: Abandoning remaining players in room "${id}" by user "${socket}"`);
// 	Object.keys(room.players)
// 		.filter((player) => player != socket)
// 		.map((user) => {
// 			io.to(user).emit('disconnection', { reason: 'disconnected', name: room.players[socket].name });
// 		});

// 	room.ended = true;

// 	// Close room
// 	closeRoom(`room.${id}`);
// 	informLobby();
// };

// Stages
// 0 - Introductory, which player is the odd one
// 1 - Ask n number of questions where n is the number of players
// 2 - Let each player decide who to ask from order of least asks

const attemptRecovery = (ip, socket, callback) => {
	let index = pending.findIndex((item) => item.ip == ip);
	// If no past disconnections, connection is confirmed based upon room presence
	// if (index == -1) {
	// 	let result = Object.entries(rooms).filter(([id, room]) => Object.keys(room.players).includes(socket.id));
	// 	return callback(result.length != 0, null);
	// }
	if (index == -1) return callback(false);

	let disconnection = pending[index];

	let current = socket.id; // Current socket ID
	let previous = pending[index].socket; // Previous socket ID

	console.log(`USER-ACTIVITY: Attempting recovery from previous disconnection (${ip})`);

	if (Date.now() - disconnection.initial < recovery_period) {
		console.log(`USER-ACTIVITY: Recovered successfully, elapsed time (${Date.now() - disconnection.initial}ms) is less than recovery period (${recovery_period}ms)`);

		clearTimeout(disconnection.timeout);
		pending.splice(index, 1);

		// Replace previous socket ID for name
		let name = users[previous];
		delete users[previous];
		users[current] = name;

		// Replace previous socket ID for rooms
		let result = Object.entries(rooms).filter(([id, room]) => room.players.includes(previous));
		if (result.length == 0) return;

		let [id, room] = result[0];

		let players = room.players;
		players.splice(
			players.findIndex((id) => id == previous),
			1
		);
		players.push(current);

		rooms[id].players = players;

		if (room.creator == previous) {
			room.creator = current;
		}

		if (room.oddone == previous) {
			room.oddone = current;
		}

		// socket.join(`room.${id}`);

		callback(true);
		return;
	}

	console.log(`USER-ACTIVITY: Failed to recover, elapsed time (${Date.now() - disconnection.initial}ms) is greater than recovery period (${recovery_period}ms)`);
	pending.splice(index, 1);
	callback(false);
};

const pick = (arr) => {
	return arr[Math.floor(Math.random() * arr.length)];
};

function factorial(n) {
	if (n == 0 || n == 1) {
		return 1;
	}
	return factorial(n - 1) * n;
}

io.on('connection', (socket) => {
	const ip = socket.handshake.headers['true-client-ip'];

	if (pending.filter((item) => item.ip == ip).length != 0) {
		attemptRecovery(ip, socket, (result) => {});
	}

	console.log(`USER-ACTIVITY: "${socket.id}" connected`);

	socket.on('error', (err) => {
		console.log(err.toString());
	});

	// Unreceived exit (browser close, refresh, etc...)
	socket.on('disconnect', (reason) => {
		console.log(`USER-ACTIVITY: "${socket.id}" disconnected`);

		// Get all disconnectable rooms
		let disconnectable = Object.entries(rooms).filter(([id, room]) => room.players.includes(socket.id) && room.players.length == 1);
		for (let [id, room] in disconnectable) {
			delete rooms[id];
		}

		if (disconnectable.length != 0) return;

		pending.push({
			ip: ip,
			socket: socket.id,
			initial: Date.now(),
			timeout: setTimeout(() => {
				console.log(`GAME-ACTIVITY: Abandoning any previous rooms of user "${socket.id}" after ${recovery_period}ms`);

				for (let [id, room] of Object.entries(rooms).filter(([id, room]) => room.players.includes(socket.id))) {
					if (room.creator == socket.id) {
						room.players
							.filter((player) => player != socket.id)
							.map((player) => {
								io.to(player).emit('lobby', { users: [] });
							});
						delete rooms[id];
					} else {
						room[id].players = room[id].players.filter((player) => player != socket.id);
						room[id].players.map((player) => {
							io.to(player).emit('lobby', { users: room[id].players.map((e) => users[e]) });
						});
					}
				}

				// Object.entries(rooms).map(([id, room]) => {
				// 	rooms[id] = {
				// 		...room,
				// 		players: room.players.filter(player => player == socket.id),
				// 	}
				// })

				// abandonPlayerRoom(socket.id);
			}, recovery_period),
		});
	});

	// Received exit (through game UI)
	// socket.on('exit', () => {});

	socket.on('insert-vote', (data, callback) => {
		let room = Object.entries(rooms).find(([id, room]) => room.players.includes(socket.id));
		if (room == undefined) return;

		let [id, room_data] = room;
		if (room_data.votes == null) {
			rooms[id].votes = {};

			for (let player of room_data.players) {
				rooms[id].votes[player] = 0;
			}
		}

		console.log(`${socket.id} voted for ${data}`);
		rooms[id].votes[data] += 1;
		let voteSum = Object.values(rooms[id].votes).reduce((a, b) => a + b, 0);
		console.log(rooms[id].votes);
		console.log(voteSum);
		room_data.players.map((player) => {
			io.to(player).emit('game', {
				word: room_data.word,
				category: room_data.category,
				oddone: room_data.oddone,
				stage: voteSum == room_data.players.length ? 4 : 3,
				creator: room_data.creator == player,
				instructions: null,
				chosen: null,
				votes: rooms[id].votes,
				players: room_data.players.map((e) => {
					return {
						id: e,
						user: users[e],
					};
				}),
			});
		});

		if (voteSum == room_data.players.length) {
			delete rooms[id];

			for (let player of room_data.players) {
				delete users[player];
			}
		}
	});

	socket.on('start-vote', (data, callback) => {
		let room = Object.entries(rooms).find(([id, room]) => room.players.includes(socket.id));
		if (room == undefined) return;

		let [id, room_data] = room;

		room_data.players.map((player) => {
			io.to(player).emit('game', {
				word: room_data.word,
				category: room_data.category,
				oddone: room_data.oddone,
				stage: 3,
				creator: room_data.creator == player,
				instructions: null,
				chosen: null,
				players: room_data.players.map((e) => {
					return {
						id: e,
						user: users[e],
					};
				}),
			});
		});
	});

	socket.on('next-vote', (data, callback) => {
		let room = Object.entries(rooms).find(([id, room]) => room.players.includes(socket.id));
		if (room == undefined) return;

		let [id, room_data] = room;

		let count = {};

		room_data.players.map((e) => {
			count[e] = 0;
		});

		room_data.instructions.previous.map((e) => {
			count[e[0]] += 1;
		});

		let sorted = Object.entries(count).sort((a, b) => a[1] - b[1]);
		let minimum = sorted[0][1];

		// Get all users with minimum asked
		let minimums = sorted.filter((item) => item[1] == minimum).map((e) => e[0]);

		let user = pick(minimums);

		rooms[id].instructions.previous.push([user, null]);

		// let pick(sorted.filter(item => item[1] == sorted[0][1]).map(e => e[0]))
		room_data.players.map((player) => {
			io.to(player).emit('game', {
				word: room_data.word,
				category: room_data.category,
				oddone: room_data.oddone,
				stage: 2,
				creator: room_data.creator == player,
				instructions: null,
				chosen: user,
				players: room_data.players.map((e) => {
					return {
						id: e,
						user: users[e],
					};
				}),
			});
		});
	});

	socket.on('next-ask', (data, callback) => {
		let room = Object.entries(rooms).find(([id, room]) => room.players.includes(socket.id));
		if (room == undefined) return;

		let [id, room_data] = room;

		if (room_data.stage == -1) return;
		if (room_data.creator != socket.id) return;

		rooms[id].stage = 1;
		if (rooms[id].instructions == undefined) {
			rooms[id].instructions = { previous: [], current: [] };
		}

		let { instructions, players } = rooms[id];

		// if (factorial(room_data.players.length) == instructions.previous.length) return console.l
		// console.log(instructions);
		// console.log(players);
		if (instructions.previous.length == room_data.players.length) {
			rooms[id].stage = 2;

			let count = {};

			room_data.players.map((e) => {
				count[e] = 0;
			});

			instructions.previous.map((e) => {
				count[e[0]] += 1;
			});

			let sorted = Object.entries(count).sort((a, b) => a[1] - b[1]);
			let minimum = sorted[0][1];

			// Get all users with minimum asked
			let minimums = sorted.filter((item) => item[1] == minimum).map((e) => e[0]);

			let user = pick(minimums);

			rooms[id].instructions.previous.push([user, null]);

			// let pick(sorted.filter(item => item[1] == sorted[0][1]).map(e => e[0]))
			room_data.players.map((player) => {
				io.to(player).emit('game', {
					word: room_data.word,
					category: room_data.category,
					oddone: room_data.oddone,
					stage: 2,
					creator: room_data.creator == player,
					instructions: null,
					chosen: user,
					players: room_data.players.map((e) => {
						return {
							id: e,
							user: users[e],
						};
					}),
				});
			});
			return;
		}

		let asker = pick(
			players.filter((player) => {
				// Get all players asked from this player
				let asked = instructions.previous.filter((e) => e[0] == player).map((e) => e[1]);

				// Ignore player if they have asked all other players
				return asked.length != players.length - 1;
			})
		);

		// Pick a player that this asker has never asked before and isn't the asker
		let askee = pick(
			players.filter(
				(player) =>
					player != asker &&
					!instructions.previous
						.filter((e) => e[0] == asker)
						.map((e) => e[1])
						.includes(player)
			)
		);

		let pair = [asker, askee];

		rooms[id].instructions = {
			previous: instructions.previous.concat([pair]),
			current: pair,
		};

		// console.log(asker);
		// console.log(askee);
		// console.log(instructions);
		// console.log(players);

		room_data.players.map((player) => {
			io.to(player).emit('game', {
				word: room_data.word,
				category: room_data.category,
				oddone: room_data.oddone,
				stage: room_data.stage,
				creator: room_data.creator == player,
				instructions: pair.map((e) => users[e]),
				players: room_data.players.map((e) => {
					return {
						id: e,
						user: users[e],
					};
				}),
			});
		});
	});

	socket.on('game', (data, callback) => {
		let room = Object.entries(rooms).find(([id, room]) => room.players.includes(socket.id));
		if (room == undefined) {
			callback({ error: true });
			return;
		}
		if (room.stage == -1) {
			callback({ error: true });
			return;
		}
		let [id, room_data] = room;

		let object = {
			word: room_data.word,
			category: room_data.category,
			oddone: room_data.oddone,
			stage: room_data.stage,
			creator: room_data.creator == socket.id,
			players: room_data.players.map((e) => {
				return {
					id: e,
					user: users[e],
				};
			}),
		};

		callback(object);
	});

	socket.on('start', (data, callback) => {
		let room = Object.entries(rooms).find(([id, room]) => room.creator == socket.id);
		if (room == undefined) return;

		let [id, room_data] = room;
		let category = Object.keys(categories)[data.category];
		let word = categories[category][Math.floor(Math.random() * categories[category].length)];
		let oddone = rooms[id].players[Math.floor(Math.random() * rooms[id].players.length)];

		rooms[id].stage = 0;
		rooms[id].word = word;
		rooms[id].category = category;
		rooms[id].oddone = oddone;

		rooms[id].players.map((socket) => {
			io.to(socket).emit('game', {
				word: word,
				category: category,
				oddone: oddone,
				stage: 0,
			});
		});
	});

	socket.on('lobby', (data, callback) => {
		let room = Object.entries(rooms).find(([room, data]) => data.players.includes(socket.id));

		if (room == undefined) return callback({ error: true, message: '' });

		let [room_id, room_data] = room;

		callback({
			users: room_data.players.map((socket) => users[socket]),
			creator: socket.id == room_data.creator,
		});
	});

	socket.on('join', (data, callback) => {
		let { room, user } = data;

		if (!Object.keys(rooms).includes(room)) {
			callback({ error: true, message: `Room "${room}" does not exist` });
			return;
		}

		if (rooms[room].players.includes(socket.id)) {
			callback({ error: true, message: `Already in room "${room}"` });
			return;
		}

		rooms[room] = {
			...rooms[room],
			players: rooms[room].players.concat(socket.id),
		};

		users[socket.id] = user;

		rooms[room].players.map((socket) => {
			io.to(socket).emit('lobby', { users: rooms[room].players.map((socket) => users[socket]) });
		});

		console.log(`${socket.id} joined room "${room}"`);
		callback({ error: false, message: '' });
	});

	socket.on('create', (data, callback) => {
		let { room, user } = data;

		if (Object.keys(rooms).includes(room)) {
			callback({ error: true, message: `Room "${room}" already exists` });
			return;
		}

		rooms[room] = {
			word: null,
			stage: -1,
			category: '',
			word: '',
			oddone: null,
			creator: socket.id,
			players: [socket.id],
		};

		users[socket.id] = user;

		console.log(`${socket.id} created room "${room}"`);

		callback({ error: false, message: '' });
	});
});

server.listen(process.env.PORT || '9000');
