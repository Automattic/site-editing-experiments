/**
 * Plays the site's animation on the sections in view, so choosing one in
 * Site Styles shows what it does. It uses the Web Animations API with the
 * same movements and timing as the front end's CSS, so the editor's own
 * block styles can't get in the way.
 */

// Where each animation starts from; every one ends with the block in place.
const FROM = {
	fade: { opacity: 0 },
	scale: { opacity: 0, transform: 'scale(.9)' },
	slide: { opacity: 0, transform: 'translateY(2.5rem)' },
	clip: { clipPath: 'inset(0 0 100% 0)' },
	flex: { opacity: 0, transform: 'translateY(2rem) scale(.96)' },
};
const TO = {
	opacity: 1,
	transform: 'none',
	clipPath: 'inset(0 0 0 0)',
};
const EASING = {
	clip: 'cubic-bezier(.6,0,.2,1)',
	flex: 'cubic-bezier(.3,1.6,.5,1)',
};

let running = [];

function canvasDocument() {
	return (
		document.querySelector( 'iframe[name="editor-canvas"]' )
			?.contentDocument || null
	);
}

// What animates in a section: its blocks, the way the front end picks them.
function itemsOf( section ) {
	const parent =
		section.querySelector( ':scope > .wp-block-cover__inner-container' ) ||
		section.querySelector( '.wp-block-sse-fluid-section__grid' ) ||
		section;
	const blocks = ( el ) =>
		Array.from( el.children ).filter( ( child ) =>
			child.classList.contains( 'block-editor-block-list__block' )
		);
	let items = blocks( parent );
	// A lone wrapper (columns, a group) animates its contents instead.
	for ( let depth = 0; depth < 3 && items.length === 1; depth++ ) {
		const inner = blocks( items[ 0 ] ).flatMap( ( child ) => {
			const grand = blocks( child );
			return grand.length ? grand : [ child ];
		} );
		if ( inner.length < 2 ) {
			break;
		}
		items = inner;
	}
	return items.length ? items : [ section ];
}

/**
 * @param {string} type Animation slug; empty plays nothing.
 */
export function previewAnimation( type ) {
	running.forEach( ( animation ) => animation.cancel() );
	running = [];
	const doc = canvasDocument();
	const from = FROM[ type ];
	if ( ! doc || ! from ) {
		return;
	}
	const view = doc.defaultView;
	if ( view.matchMedia?.( '(prefers-reduced-motion: reduce)' ).matches ) {
		return;
	}
	const inView = ( el ) => {
		const box = el.getBoundingClientRect();
		return box.bottom > 0 && box.top < view.innerHeight;
	};
	const to = Object.fromEntries(
		Object.keys( from ).map( ( key ) => [ key, TO[ key ] ] )
	);
	doc.querySelectorAll( '.sse-section:not(.sse-section--shared)' ).forEach(
		( section ) => {
			if ( ! inView( section ) ) {
				return;
			}
			itemsOf( section ).forEach( ( el, i ) => {
				running.push(
					el.animate( [ from, to ], {
						duration: 800,
						delay: Math.min( i * 80, 400 ),
						easing: EASING[ type ] || 'cubic-bezier(.2,.7,.2,1)',
						fill: 'backwards',
					} )
				);
			} );
		}
	);
}
