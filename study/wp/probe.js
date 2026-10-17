/**
 * The study probe: reads a page being edited and describes it the same way
 * whichever editor it's in, so the study can check every task with the same
 * rules in every prototype.
 *
 * It runs in two places:
 * - On the study page, for prototypes on the same site (Albers, Cassatt):
 *   StudyProbe.model( win, 'albers' ) reads the prototype's frame directly.
 * - Inside WordPress (Degas, Bourgeois, plain Gutenberg), loaded by the study
 *   plugin in the editor: it reads the editor canvas and posts the model to
 *   the study page (window.top) whenever the page changes.
 *
 * The model: { ready, sections: [ { id, text, headings, images, bg, quote } ],
 * clicks }. Geometry is in the viewport's pixels; only relative positions
 * within one section are compared.
 */
( function ( root ) {
	'use strict';

	var ADAPTERS = {
		albers: {
			sections: function ( doc ) {
				return doc.querySelectorAll( 'main > .sec' );
			},
			id: function ( el ) {
				return el.dataset.section;
			},
			chrome: '.ov, .tbwrap, .xlayer, .sectab, .grid, .gv, .gh, .selbox, .lp, .ins, .rep, .xbtn',
		},
		cassatt: {
			sections: function ( doc ) {
				return doc.querySelectorAll( '#page > .sec:not(.header):not(.footer)' );
			},
			id: function ( el ) {
				return el.dataset.id;
			},
			chrome: '.sectab, .handles, .slot',
		},
		wordpress: {
			sections: function ( doc ) {
				var list =
					doc.querySelector( '.wp-block-post-content.block-editor-block-list__layout' ) ||
					doc.querySelector( '.is-root-container' );
				if ( ! list ) {
					return [];
				}
				return Array.prototype.filter.call( list.children, function ( el ) {
					var type = el.getAttribute( 'data-type' );
					return (
						el.hasAttribute( 'data-block' ) &&
						type !== 'core/post-title' &&
						type !== 'core/template-part'
					);
				} );
			},
			id: function ( el ) {
				return el.getAttribute( 'data-block' );
			},
			chrome: '[data-sse-section-chrome], .dg-layer, .components-drop-zone, .block-list-appender, .block-editor-block-list__insertion-point, .components-popover',
		},
	};

	function norm( s ) {
		return ( s || '' )
			.replace( /[‘’]/g, "'" )
			.replace( /\s+/g, ' ' )
			.trim();
	}

	// The section's own words, without any editing chrome inside it.
	function textOf( el, chrome ) {
		var out = [];
		var walker = el.ownerDocument.createTreeWalker( el, 4 /* text */ );
		var node;
		while ( ( node = walker.nextNode() ) ) {
			var parent = node.parentElement;
			if ( parent && ! inChrome( parent, chrome, el ) && ! /^(SCRIPT|STYLE)$/.test( parent.tagName ) ) {
				out.push( node.nodeValue );
			}
		}
		return norm( out.join( ' ' ) );
	}

	function visible( el, win ) {
		var cs = win.getComputedStyle( el );
		if ( cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 ) {
			return false;
		}
		var r = el.getBoundingClientRect();
		return r.width > 4 && r.height > 4;
	}

	function inChrome( el, chrome, section ) {
		return chrome && el.closest( chrome ) && section.contains( el.closest( chrome ) );
	}

	function rect( r ) {
		return { x: Math.round( r.left ), y: Math.round( r.top ), w: Math.round( r.width ), h: Math.round( r.height ) };
	}

	// What the section looks like behind its content: the background of the
	// section and of anything inside it that covers most of it.
	function backgroundOf( el, win, chrome ) {
		var area = function ( n ) {
			var r = n.getBoundingClientRect();
			return r.width * r.height;
		};
		var total = area( el ) || 1;
		var parts = [];
		var add = function ( n ) {
			var cs = win.getComputedStyle( n );
			var c = cs.backgroundColor;
			var img = cs.backgroundImage;
			if ( ( c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent' ) || ( img && img !== 'none' ) ) {
				parts.push( c + ( img && img !== 'none' ? ' ' + img.slice( 0, 80 ) : '' ) );
			}
		};
		add( el );
		el.querySelectorAll( '*' ).forEach( function ( n ) {
			if ( n.tagName === 'IMG' || inChrome( n, chrome, el ) || area( n ) < total * 0.6 ) {
				return;
			}
			add( n );
		} );
		return parts.join( ' | ' ) || 'none';
	}

	function describe( el, adapter, win ) {
		var chrome = adapter.chrome;
		var headings = [];
		el.querySelectorAll( 'h1, h2, h3' ).forEach( function ( h ) {
			if ( inChrome( h, chrome, el ) || ! visible( h, win ) ) {
				return;
			}
			headings.push( {
				text: norm( h.textContent ),
				size: parseFloat( win.getComputedStyle( h ).fontSize ) || 0,
				rect: rect( h.getBoundingClientRect() ),
			} );
		} );
		var images = [];
		el.querySelectorAll( 'img' ).forEach( function ( img ) {
			if ( inChrome( img, chrome, el ) || ! visible( img, win ) ) {
				return;
			}
			images.push( { rect: rect( img.getBoundingClientRect() ) } );
		} );
		var text = textOf( el, chrome );
		var quote =
			!! el.querySelector( 'blockquote' ) ||
			/(^|[\s_-])(quote|pullquote|testimonial)/i.test( el.className || '' ) ||
			!! el.querySelector( '[class*="quote"], [class*="testimonial"]' ) ||
			/“[^”]{8,}”/.test( text );
		return {
			id: adapter.id( el ),
			text: text.slice( 0, 600 ),
			headings: headings,
			images: images,
			bg: backgroundOf( el, win, chrome ),
			quote: quote,
		};
	}

	// Counts clicks in a document (and its editor canvas), once per document.
	function countClicks( doc, store ) {
		if ( ! doc || doc.__studyClicks ) {
			return;
		}
		doc.__studyClicks = true;
		doc.addEventListener(
			'pointerdown',
			function () {
				store.clicks++;
			},
			true
		);
	}

	var clickStore = { clicks: 0 };

	function model( win, adapterName ) {
		var adapter = ADAPTERS[ adapterName ];
		var doc = win.document;
		if ( adapterName === 'wordpress' ) {
			countClicks( doc, clickStore );
			var frame = doc.querySelector( 'iframe[name="editor-canvas"]' );
			if ( ! frame || ! frame.contentDocument ) {
				return { ready: false, sections: [], clicks: clickStore.clicks };
			}
			win = frame.contentWindow;
			doc = frame.contentDocument;
		}
		countClicks( doc, clickStore );
		var sections = Array.prototype.map.call( adapter.sections( doc ), function ( el ) {
			return describe( el, adapter, win );
		} );
		return { ready: sections.length > 0, sections: sections, clicks: clickStore.clicks };
	}

	root.StudyProbe = { model: model, adapters: ADAPTERS };

	// Inside WordPress: report to the study page.
	if ( root.studyProbeReport && root.top !== root ) {
		var last = '';
		var send = function () {
			var m;
			try {
				m = model( root, 'wordpress' );
			} catch ( e ) {
				return;
			}
			var json = JSON.stringify( m );
			if ( json !== last ) {
				last = json;
				root.top.postMessage( { source: 'study-probe', model: m }, '*' );
			}
		};
		root.setInterval( send, 600 );
	}
} )( window );
