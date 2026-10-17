/**
 * The site editing user test: an unmoderated study that runs on its own.
 *
 * Each participant uses three of the five editors (a balanced rotation, so
 * every editor is seen as often as the others, and in each position as
 * often), and does the same five tasks in each. The study notices when a
 * task is done, by reading the page through the probe, and asks how easy it
 * was; after each editor it asks two questions about it, and at the end which
 * they'd rather use. Results are sent to an endpoint if there is one, and can
 * always be downloaded.
 *
 * URL parameters (all optional):
 *   pid       participant ID, e.g. from a recruiting platform
 *   group     0–9: which editors, in which order (otherwise random)
 *   editors   a comma-separated list instead of a group, e.g. degas,gutenberg
 *   endpoint  a URL the results are POSTed to as JSON, after each editor and at the end
 *   done      a URL to send the participant to at the end (e.g. a completion link)
 *   limit     seconds allowed per task (default 240)
 */
( function () {
	'use strict';

	var STUDY = 'site-editing-experiments-study';
	var VERSION = 1;
	var REPO_RAW = 'https://raw.githubusercontent.com/Automattic/site-editing-experiments/trunk/study/blueprints/';

	var EDITORS = {
		albers: { name: 'Albers', kind: 'static', src: '../albers/?embed', adapter: 'albers' },
		cassatt: { name: 'Cassatt', kind: 'static', src: '../cassatt/?embed', adapter: 'cassatt' },
		degas: { name: 'Degas', kind: 'wordpress', blueprint: 'degas.json' },
		bourgeois: { name: 'Bourgeois', kind: 'wordpress', blueprint: 'bourgeois.json' },
		gutenberg: { name: 'Gutenberg', kind: 'wordpress', blueprint: 'gutenberg.json' },
	};
	var ORDER = [ 'albers', 'cassatt', 'degas', 'bourgeois', 'gutenberg' ];

	// Ten groups of three: five rotations forwards and the same five backwards,
	// so each editor appears in six groups, twice in each position.
	var GROUPS = [];
	( function () {
		var i;
		for ( i = 0; i < 5; i++ ) {
			GROUPS.push( [ ORDER[ i ], ORDER[ ( i + 1 ) % 5 ], ORDER[ ( i + 2 ) % 5 ] ] );
		}
		for ( i = 0; i < 5; i++ ) {
			GROUPS.push( GROUPS[ i ].slice().reverse() );
		}
	} )();

	var TASKS = window.StudyTasks.TASKS;
	var params = new URLSearchParams( location.search );
	var LIMIT = Math.max( 30, parseInt( params.get( 'limit' ), 10 ) || 240 ) * 1000;

	function randomId( n ) {
		var chars = 'abcdefghjkmnpqrstuvwxyz23456789';
		var out = '';
		var bytes = new Uint8Array( n );
		( window.crypto || window.msCrypto ).getRandomValues( bytes );
		for ( var i = 0; i < n; i++ ) {
			out += chars[ bytes[ i ] % chars.length ];
		}
		return out;
	}

	// ---------- Who, and which editors ----------
	var group = parseInt( params.get( 'group' ), 10 );
	var chosen = ( params.get( 'editors' ) || '' )
		.split( ',' )
		.map( function ( s ) {
			return s.trim().toLowerCase();
		} )
		.filter( function ( s ) {
			return EDITORS[ s ];
		} );
	if ( ! chosen.length ) {
		if ( ! ( group >= 0 && group < GROUPS.length ) ) {
			group = Math.floor( Math.random() * GROUPS.length );
		}
		chosen = GROUPS[ group ];
	} else {
		group = null;
	}

	var data = {
		study: STUDY,
		version: VERSION,
		pid: ( params.get( 'pid' ) || '' ).slice( 0, 80 ) || randomId( 10 ),
		group: group,
		editors: chosen,
		complete: false,
		startedAt: new Date().toISOString(),
		finishedAt: null,
		screen: { w: window.innerWidth, h: window.innerHeight },
		userAgent: navigator.userAgent,
		background: {},
		sessions: [],
		preference: null,
		comments: '',
	};

	// ---------- Elements ----------
	var screen = document.getElementById( 'screen' );
	var stage = document.getElementById( 'stage' );
	var bar = document.getElementById( 'taskbar' );
	var barStep = document.getElementById( 'tb-step' );
	var barTask = document.getElementById( 'tb-task' );
	var btnSkip = document.getElementById( 'tb-skip' );
	var btnDone = document.getElementById( 'tb-done' );

	function esc( s ) {
		return String( s ).replace( /[&<>"']/g, function ( c ) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ c ];
		} );
	}

	function show( html, over ) {
		screen.innerHTML = html;
		screen.hidden = false;
		screen.classList.toggle( 'over', !! over );
		var focus = screen.querySelector( '[autofocus], h1, h2' );
		if ( focus ) {
			if ( ! focus.hasAttribute( 'tabindex' ) && /^H/.test( focus.tagName ) ) {
				focus.setAttribute( 'tabindex', '-1' );
			}
			focus.focus( { preventScroll: true } );
		}
		screen.scrollTop = 0;
	}

	function hideScreen() {
		screen.hidden = true;
		screen.innerHTML = '';
	}

	function toast( text ) {
		var t = document.createElement( 'div' );
		t.className = 'toast';
		t.setAttribute( 'role', 'status' );
		t.textContent = text;
		document.body.appendChild( t );
		setTimeout( function () {
			t.remove();
		}, 1600 );
	}

	// A 7-point scale question. Returns its HTML; read it back with value( name ).
	function scale( name, legend, low, high ) {
		var html = '<fieldset><legend>' + esc( legend ) + '</legend><div class="scale" role="radiogroup">';
		for ( var i = 1; i <= 7; i++ ) {
			html += '<label><input type="radio" name="' + name + '" value="' + i + '"><span>' + i + '</span></label>';
		}
		return html + '</div><div class="ends"><span>' + esc( low ) + '</span><span>' + esc( high ) + '</span></div></fieldset>';
	}

	function choices( name, legend, options ) {
		return (
			'<fieldset><legend>' + esc( legend ) + '</legend><div class="choices">' +
			options
				.map( function ( o ) {
					return '<label class="choice"><input type="radio" name="' + name + '" value="' + esc( o[ 0 ] ) + '">' + esc( o[ 1 ] ) + '</label>';
				} )
				.join( '' ) +
			'</div></fieldset>'
		);
	}

	function value( name ) {
		var el = screen.querySelector( 'input[name="' + name + '"]:checked' );
		return el ? el.value : null;
	}

	// Enables a button once every named question has an answer.
	function requireAnswers( buttonId, names, extra ) {
		var btn = document.getElementById( buttonId );
		var update = function () {
			btn.disabled = ! names.every( value ) || ( extra && ! extra() );
		};
		screen.addEventListener( 'change', update );
		update();
		return btn;
	}

	// ---------- Saving and sending ----------
	function save() {
		try {
			localStorage.setItem( STUDY + ':' + data.pid, JSON.stringify( data ) );
		} catch ( e ) {}
	}

	function send() {
		save();
		var endpoint = params.get( 'endpoint' );
		if ( ! endpoint ) {
			return Promise.resolve( false );
		}
		// text/plain keeps it a simple request, which any endpoint can accept.
		return fetch( endpoint, {
			method: 'POST',
			mode: 'no-cors',
			keepalive: true,
			headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
			body: JSON.stringify( data ),
		} ).then(
			function () {
				return true;
			},
			function () {
				return false;
			}
		);
	}

	function download() {
		var blob = new Blob( [ JSON.stringify( data, null, 2 ) ], { type: 'application/json' } );
		var a = document.createElement( 'a' );
		a.href = URL.createObjectURL( blob );
		a.download = 'editor-study-' + data.pid + '.json';
		document.body.appendChild( a );
		a.click();
		setTimeout( function () {
			URL.revokeObjectURL( a.href );
			a.remove();
		}, 500 );
	}

	// ---------- Editors in frames ----------
	var frames = {}; // key -> { el, kind, ready, model, readyAt, createdAt }

	function frameSrc( key ) {
		var ed = EDITORS[ key ];
		if ( ed.kind === 'static' ) {
			return ed.src;
		}
		var bp = params.get( 'blueprints' ) ? new URL( ed.blueprint, params.get( 'blueprints' ) ).href : REPO_RAW + ed.blueprint;
		return 'https://playground.wordpress.net/?mode=seamless&blueprint-url=' + encodeURIComponent( bp );
	}

	function load( key ) {
		if ( frames[ key ] ) {
			return frames[ key ];
		}
		var el = document.createElement( 'iframe' );
		el.className = 'off';
		el.inert = true;
		el.title = 'Website editor';
		el.setAttribute( 'allow', 'clipboard-read; clipboard-write' );
		var f = { key: key, el: el, kind: EDITORS[ key ].kind, ready: false, model: null, createdAt: Date.now(), readyAt: null };
		frames[ key ] = f;
		el.addEventListener( 'load', function () {
			if ( f.kind === 'static' ) {
				// Same site: read the page directly. Wait for its script to build it.
				setTimeout( function () {
					f.ready = true;
					f.readyAt = f.readyAt || Date.now();
				}, 600 );
			}
		} );
		el.src = frameSrc( key );
		stage.appendChild( el );
		return f;
	}

	function unload( key ) {
		var f = frames[ key ];
		if ( f ) {
			f.el.remove();
			delete frames[ key ];
		}
	}

	// The current model of an editor's page.
	function modelOf( f ) {
		if ( f.kind === 'static' ) {
			try {
				return window.StudyProbe.model( f.el.contentWindow, EDITORS[ f.key ].adapter );
			} catch ( e ) {
				return null;
			}
		}
		return f.model;
	}

	// WordPress editors report from deep inside Playground's frames; find which one.
	window.addEventListener( 'message', function ( e ) {
		if ( ! e.data || e.data.source !== 'study-probe' ) {
			return;
		}
		Object.keys( frames ).forEach( function ( key ) {
			var f = frames[ key ];
			if ( f.kind !== 'wordpress' ) {
				return;
			}
			var w = e.source;
			for ( var i = 0; w && i < 8; i++ ) {
				if ( w === f.el.contentWindow ) {
					f.model = e.data.model;
					if ( f.model.ready && ! f.ready ) {
						f.ready = true;
						f.readyAt = Date.now();
					}
					return;
				}
				try {
					w = w.parent === w ? null : w.parent;
				} catch ( err ) {
					w = null;
				}
			}
		} );
	} );

	function showFrame( key ) {
		Object.keys( frames ).forEach( function ( k ) {
			var off = k !== key;
			frames[ k ].el.classList.toggle( 'off', off );
			frames[ k ].el.inert = off;
		} );
	}

	// ---------- Screens ----------
	function welcome() {
		var narrow = window.innerWidth < 1200;
		show(
			'<div class="card wide">' +
				'<p class="kicker">Website editor study</p>' +
				'<h1>Help us make editing a website easier</h1>' +
				'<p class="lead">You’ll try three different editors for changing a website, and do five short tasks in each, on the same small site for a pottery studio.</p>' +
				'<ul class="list">' +
				'<li>It takes about <strong>25 minutes</strong>.</li>' +
				'<li>We’re testing the editors, not you. There are no wrong answers, and it’s fine to skip a task if you get stuck.</li>' +
				'<li>Each editor notices when you’ve done a task and moves you on. Then we ask how easy it was.</li>' +
				'<li>Some editors take a minute to start, because they run a real WordPress site in your browser. Nothing you do is published.</li>' +
				'</ul>' +
				'<p class="muted">We record your answers, how long each task takes, how many times you click, and your browser and window size. We don’t record your screen or anything you type into the editors, and we don’t ask for your name.</p>' +
				( narrow ? '<p class="warn">Your window is quite narrow. The editors work best on a computer with a window at least 1200 pixels wide, so please make it bigger or use a larger screen if you can.</p>' : '' ) +
				choices( 'wp', 'How often do you use WordPress?', [
					[ 'never', 'Never' ],
					[ 'tried', 'I’ve tried it a few times' ],
					[ 'monthly', 'About once a month' ],
					[ 'weekly', 'Every week' ],
					[ 'daily', 'Every day, or most days' ],
				] ) +
				choices( 'design', 'Have you changed the design of a website before (not just its words)?', [
					[ 'no', 'No' ],
					[ 'little', 'A little' ],
					[ 'often', 'Yes, often' ],
				] ) +
				'<label class="consent"><input type="checkbox" id="consent"><span>I agree to take part, and for my answers and these measurements to be used to improve WordPress.</span></label>' +
				'<div class="actions"><button type="button" class="btn big" id="go" disabled>Start</button></div>' +
				'</div>'
		);
		var consent = document.getElementById( 'consent' );
		var go = requireAnswers( 'go', [ 'wp', 'design' ], function () {
			return consent.checked;
		} );
		consent.addEventListener( 'change', function () {
			go.disabled = ! value( 'wp' ) || ! value( 'design' ) || ! consent.checked;
		} );
		go.addEventListener( 'click', function () {
			data.background = { wordpress: value( 'wp' ), design: value( 'design' ) };
			save();
			editorIntro( 0 );
		} );
	}

	function editorIntro( i ) {
		var key = chosen[ i ];
		var f = load( key );
		if ( chosen[ i + 1 ] ) {
			// Start the next one now, so it's ready when they get there.
			setTimeout( function () {
				load( chosen[ i + 1 ] );
			}, 4000 );
		}
		bar.hidden = true;
		show(
			'<div class="card">' +
				'<div class="progress" aria-hidden="true"><span style="width:' + Math.round( ( i / chosen.length ) * 100 ) + '%"></span></div>' +
				'<p class="kicker">Editor ' + ( i + 1 ) + ' of ' + chosen.length + '</p>' +
				'<h2>' + ( i === 0 ? 'Your first editor' : 'Next, a different editor' ) + '</h2>' +
				'<p class="lead">You’ll make five changes to the home page of Northfield Ceramics, a small pottery studio. Do each one however seems natural to you in this editor.</p>' +
				'<p>Your task is shown in the dark bar at the top of the screen. When the editor notices you’ve done it, we’ll move on. If you think you’ve done it and nothing happens, choose <strong>I’ve done it</strong>; if you’re stuck, choose <strong>Skip this task</strong>.</p>' +
				( i > 0 ? '<p class="muted">This editor may work differently from the last one. That’s what we want to find out.</p>' : '' ) +
				'<div class="actions"><button type="button" class="btn big" id="go" disabled>Start</button><span class="loading" id="loading"><span class="spinner" aria-hidden="true"></span>Getting the editor ready… this can take a minute.</span></div>' +
				'</div>'
		);
		var go = document.getElementById( 'go' );
		var loading = document.getElementById( 'loading' );
		var waited = Date.now();
		var timer = setInterval( function () {
			if ( f.ready && modelOf( f ) && modelOf( f ).ready ) {
				clearInterval( timer );
				go.disabled = false;
				loading.innerHTML = '<span class="good">Ready</span>';
				go.focus();
			} else if ( Date.now() - f.createdAt > 120000 && ! f.retried ) {
				// Now and then Playground doesn't finish starting: start it again, once, quietly.
				var retried = ( f.retries || 0 ) + 1;
				unload( key );
				f = load( key );
				f.retried = true;
				f.retries = retried;
			} else if ( Date.now() - waited > 240000 && ! document.getElementById( 'reload' ) ) {
				loading.insertAdjacentHTML( 'beforeend', ' <button type="button" class="btn ghost" id="reload">Try again</button>' );
				document.getElementById( 'reload' ).addEventListener( 'click', function () {
					unload( key );
					clearInterval( timer );
					editorIntro( i );
				} );
			}
		}, 400 );
		go.addEventListener( 'click', function () {
			clearInterval( timer );
			var session = {
				editor: key,
				position: i + 1,
				loadMs: f.readyAt ? f.readyAt - f.createdAt : null,
				loadRetries: f.retries || 0,
				baseline: null,
				tasks: [],
				umux: null,
				umuxScore: null,
				confusing: '',
			};
			data.sessions.push( session );
			session.baseline = summarise( modelOf( f ) );
			runTask( i, 0, session, modelOf( f ) );
		} );
	}

	// A little of the baseline, to help check results later.
	function summarise( m ) {
		return m ? { sections: m.sections.length, headings: m.sections.map( function ( s ) {
			return s.headings[ 0 ] ? s.headings[ 0 ].text.slice( 0, 60 ) : '';
		} ) } : null;
	}

	function runTask( i, j, session, base ) {
		var key = chosen[ i ];
		var f = frames[ key ];
		var task = TASKS[ j ];
		hideScreen();
		showFrame( key );
		bar.hidden = false;
		barStep.textContent = 'Editor ' + ( i + 1 ) + ' · Task ' + ( j + 1 ) + ' of ' + TASKS.length;
		barTask.textContent = task.text;
		var started = Date.now();
		var startClicks = ( modelOf( f ) || {} ).clicks || 0;
		var finished = false;
		// A task can already be done by the time it comes up (say, while doing an
		// earlier one). It's recorded as such and skipped.
		if ( isDone( task, f, base ) ) {
			session.tasks.push( { id: task.id, outcome: 'done-earlier', ms: 0, clicks: 0, seq: null } );
			save();
			toast( 'Already done' );
			setTimeout( function () {
				if ( j + 1 < TASKS.length ) {
					runTask( i, j + 1, session, base );
				} else {
					askEditor( i, session );
				}
			}, 900 );
			return;
		}

		function finish( outcome ) {
			if ( finished ) {
				return;
			}
			finished = true;
			clearInterval( poll );
			var m = modelOf( f ) || {};
			var record = {
				id: task.id,
				outcome: outcome,
				ms: Date.now() - started,
				clicks: Math.max( 0, ( m.clicks || 0 ) - startClicks ),
				seq: null,
			};
			session.tasks.push( record );
			save();
			if ( outcome === 'success' ) {
				toast( 'Done' );
			}
			setTimeout( function () {
				askEase( i, j, session, base, record );
			}, outcome === 'success' ? 700 : 0 );
		}

		var poll = setInterval( function () {
			if ( isDone( task, f, base ) ) {
				finish( 'success' );
			} else if ( Date.now() - started > LIMIT ) {
				finish( 'timeout' );
			}
		}, 500 );
		btnDone.onclick = function () {
			finish( isDone( task, f, base ) ? 'success' : 'claimed' );
		};
		btnSkip.onclick = function () {
			finish( 'skipped' );
		};
		btnDone.focus( { preventScroll: true } );
	}

	function isDone( task, f, base ) {
		var m = modelOf( f );
		try {
			return !! ( m && m.ready && task.check( m, base ) );
		} catch ( e ) {
			return false;
		}
	}

	function askEase( i, j, session, base, record ) {
		var headline = {
			success: 'Nicely done.',
			claimed: 'Thanks.',
			skipped: 'No problem.',
			timeout: 'Let’s move on to the next one.',
		}[ record.outcome ];
		show(
			'<div class="card">' +
				'<p class="kicker">Task ' + ( j + 1 ) + ' of ' + TASKS.length + '</p>' +
				'<h2>' + headline + '</h2>' +
				scale( 'seq', 'Overall, how easy or difficult was this task?', '1 · Very difficult', '7 · Very easy' ) +
				'<div class="actions"><button type="button" class="btn" id="next" disabled>' + ( j + 1 < TASKS.length ? 'Next task' : 'Continue' ) + '</button></div>' +
				'</div>',
			true
		);
		bar.hidden = true;
		requireAnswers( 'next', [ 'seq' ] ).addEventListener( 'click', function () {
			record.seq = +value( 'seq' );
			save();
			if ( j + 1 < TASKS.length ) {
				runTask( i, j + 1, session, base );
			} else {
				askEditor( i, session );
			}
		} );
	}

	function askEditor( i, session ) {
		show(
			'<div class="card">' +
				'<p class="kicker">Editor ' + ( i + 1 ) + ' of ' + chosen.length + '</p>' +
				'<h2>About that editor</h2>' +
				'<p class="muted">How much do you agree with each statement?</p>' +
				scale( 'u1', 'This editor’s capabilities meet my requirements.', '1 · Strongly disagree', '7 · Strongly agree' ) +
				scale( 'u2', 'This editor is easy to use.', '1 · Strongly disagree', '7 · Strongly agree' ) +
				'<fieldset><legend><label for="conf">What, if anything, confused you or got in your way? (optional)</label></legend><textarea id="conf"></textarea></fieldset>' +
				'<div class="actions"><button type="button" class="btn" id="next" disabled>Continue</button></div>' +
				'</div>',
			true
		);
		requireAnswers( 'next', [ 'u1', 'u2' ] ).addEventListener( 'click', function () {
			var a = +value( 'u1' );
			var b = +value( 'u2' );
			session.umux = [ a, b ];
			// UMUX-Lite on a 0–100 scale.
			session.umuxScore = Math.round( ( ( a - 1 + ( b - 1 ) ) / 12 ) * 1000 ) / 10;
			session.confusing = document.getElementById( 'conf' ).value.trim().slice( 0, 4000 );
			send();
			unload( chosen[ i ] );
			if ( i + 1 < chosen.length ) {
				editorIntro( i + 1 );
			} else {
				final();
			}
		} );
	}

	function final() {
		bar.hidden = true;
		var order = [ 'first', 'second', 'third', 'fourth', 'fifth' ];
		show(
			'<div class="card">' +
				'<div class="progress" aria-hidden="true"><span style="width:100%"></span></div>' +
				'<p class="kicker">Last questions</p>' +
				'<h2>Which editor would you rather use?</h2>' +
				choices(
					'pref',
					'If you had to make changes like these to your own website, which editor would you choose?',
					chosen.map( function ( key, i ) {
						return [ key, 'Editor ' + ( i + 1 ) + ' (the ' + order[ i ] + ' one)' ];
					} )
				) +
				'<fieldset><legend><label for="why">Why that one?</label></legend><textarea id="why"></textarea></fieldset>' +
				'<fieldset><legend><label for="more">Anything else you’d like to tell us? (optional)</label></legend><textarea id="more"></textarea></fieldset>' +
				'<div class="actions"><button type="button" class="btn big" id="finish" disabled>Finish</button></div>' +
				'</div>'
		);
		requireAnswers( 'finish', [ 'pref' ] ).addEventListener( 'click', function () {
			data.preference = { editor: value( 'pref' ), reason: document.getElementById( 'why' ).value.trim().slice( 0, 4000 ) };
			data.comments = document.getElementById( 'more' ).value.trim().slice( 0, 4000 );
			data.complete = true;
			data.finishedAt = new Date().toISOString();
			send().then( thanks );
		} );
	}

	function thanks( sent ) {
		var done = params.get( 'done' );
		var code = data.pid.slice( 0, 10 ).toUpperCase();
		show(
			'<div class="card">' +
				'<p class="kicker">All done</p>' +
				'<h1>Thank you!</h1>' +
				'<p class="lead">That’s everything. Your answers will help shape how WordPress editing works.</p>' +
				( sent ? '<p>Your answers have been sent.</p>' : '<p>If you were asked to send your answers, download them here and send the file back.</p>' ) +
				'<p>Your completion code: <span class="code">' + esc( code ) + '</span></p>' +
				'<div class="actions">' +
				( done ? '<a class="btn big" id="return" href="' + esc( done ) + '">Return to finish</a>' : '' ) +
				'<button type="button" class="btn ghost" id="dl">Download my answers</button>' +
				'</div></div>'
		);
		document.getElementById( 'dl' ).addEventListener( 'click', download );
	}

	// For tests and for the person running the study: the data so far, and
	// what the study sees in an editor right now (is it ready, and which tasks
	// would count as done against a baseline taken now or passed in).
	window.studyData = function () {
		return data;
	};
	window.studyCheck = function ( key, base ) {
		var f = frames[ key || chosen[ 0 ] ];
		var m = f && modelOf( f );
		if ( ! m || ! m.ready ) {
			return { ready: false };
		}
		base = base || m;
		return {
			ready: true,
			model: m,
			sections: m.sections.length,
			pricing: window.StudyTasks.pricingCount( m ),
			done: TASKS.map( function ( t ) {
				return t.check( m, base );
			} ),
		};
	};

	// Start loading the first editor straight away, while they read the welcome.
	load( chosen[ 0 ] );
	welcome();
} )();
