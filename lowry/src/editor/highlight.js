/**
 * Shows which blocks a tool touched or pointed at: an outline on the canvas,
 * with a label, that fades after a few seconds. It's drawn in the canvas
 * iframe, over the blocks, and never takes the pointer.
 */
const STYLES = `
.lowry-mark{position:absolute;pointer-events:none;z-index:99999;border-radius:2px;
  outline:2px solid #3858E9;outline-offset:2px;background:rgba(56,88,233,.08);
  transition:opacity .4s ease;animation:lowry-in .25s ease}
.lowry-mark.is-change{outline-color:#00A32A;background:rgba(0,163,42,.07)}
.lowry-mark.is-gone{opacity:0}
.lowry-mark span{position:absolute;left:-2px;top:-30px;max-width:320px;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;padding:4px 8px;border-radius:4px;background:#3858E9;color:#fff;
  font:500 12px/16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.lowry-mark.is-change span{background:#00A32A}
@keyframes lowry-in{from{opacity:0;transform:scale(.98)}to{opacity:1}}
`;

function canvasDocument() {
	const iframe = document.querySelector( 'iframe[name="editor-canvas"]' );
	return iframe?.contentDocument || document;
}

function ensureStyle( doc ) {
	if ( ! doc.getElementById( 'lowry-mark-style' ) ) {
		const style = doc.createElement( 'style' );
		style.id = 'lowry-mark-style';
		style.textContent = STYLES;
		doc.head.appendChild( style );
	}
}

export function blockElement( clientId ) {
	return canvasDocument().querySelector(
		`[data-block="${ window.CSS.escape( clientId ) }"]`
	);
}

/**
 * Outlines blocks for a few seconds.
 *
 * @param {string[]} clientIds      The blocks.
 * @param {Object}   options
 * @param {string}   options.label  A label over the first.
 * @param {string}   options.kind   'point' (blue) or 'change' (green).
 * @param {number}   options.ms     How long it stays.
 * @param {boolean}  options.scroll Scroll the first into view.
 */
export function mark(
	clientIds,
	{ label = '', kind = 'point', ms = 3500, scroll = true } = {}
) {
	const doc = canvasDocument();
	if ( ! doc?.body ) {
		return;
	}
	ensureStyle( doc );
	const win = doc.defaultView;
	const els = clientIds
		.map( ( id ) =>
			doc.querySelector( `[data-block="${ window.CSS.escape( id ) }"]` )
		)
		.filter( Boolean );
	if ( scroll && els[ 0 ] ) {
		els[ 0 ].scrollIntoView( { block: 'nearest', behavior: 'smooth' } );
	}
	// Wait a frame for the block to render or the scroll to start.
	win.requestAnimationFrame( () =>
		els.forEach( ( el, i ) => {
			const r = el.getBoundingClientRect();
			const box = doc.createElement( 'div' );
			box.className = `lowry-mark is-${ kind }`;
			Object.assign( box.style, {
				left: `${ r.left + win.scrollX }px`,
				top: `${ r.top + win.scrollY }px`,
				width: `${ r.width }px`,
				height: `${ r.height }px`,
			} );
			if ( label && i === 0 ) {
				const tag = doc.createElement( 'span' );
				tag.textContent = label;
				if ( r.top < 34 ) {
					tag.style.top = '4px';
					tag.style.left = '4px';
				}
				box.appendChild( tag );
			}
			doc.body.appendChild( box );
			setTimeout( () => box.classList.add( 'is-gone' ), ms );
			setTimeout( () => box.remove(), ms + 500 );
		} )
	);
}
