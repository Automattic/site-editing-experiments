/**
 * The activity log: every tool call, whoever made it, newest last.
 */
let entries = [];
let nextId = 1;
const listeners = new Set();

export function log( entry ) {
	entries = [
		...entries.slice( -199 ),
		{ id: nextId++, at: new Date(), ...entry },
	];
	listeners.forEach( ( fn ) => fn() );
}

export function getEntries() {
	return entries;
}

export function clear() {
	entries = [];
	listeners.forEach( ( fn ) => fn() );
}

export function subscribe( fn ) {
	listeners.add( fn );
	return () => listeners.delete( fn );
}
