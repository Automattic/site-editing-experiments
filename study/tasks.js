/**
 * The tasks, and how the study knows each is done.
 *
 * Every check reads the page model from the probe (see wp/probe.js), and
 * compares it with the model taken when the editor first loaded (the
 * baseline), so the same rules apply in every prototype. Tasks are worded by
 * goal, never by a prototype's controls.
 */
( function ( root ) {
	'use strict';

	var NEW_HEADING = 'Handmade stoneware from Northfield';

	function simplify( s ) {
		return ( s || '' ).toLowerCase().replace( /[^a-z0-9]+/g, ' ' ).trim();
	}

	function byId( model, id ) {
		for ( var i = 0; i < model.sections.length; i++ ) {
			if ( model.sections[ i ].id === id ) {
				return model.sections[ i ];
			}
		}
		return null;
	}

	// The page's top section: the one that was first when the editor loaded,
	// or, if it has been replaced, whatever is first now.
	function topSection( model, base ) {
		return byId( model, base.sections[ 0 ].id ) || model.sections[ 0 ] || null;
	}

	function mainHeading( section ) {
		var best = null;
		( section ? section.headings : [] ).forEach( function ( h ) {
			if ( ! best || h.size > best.size ) {
				best = h;
			}
		} );
		return best;
	}

	function mainImage( section ) {
		var best = null;
		( section ? section.images : [] ).forEach( function ( img ) {
			if ( ! best || img.rect.w * img.rect.h > best.rect.w * best.rect.h ) {
				best = img;
			}
		} );
		return best;
	}

	// Where the photo sits relative to the heading: dx and dy between centres.
	function offset( section ) {
		var h = mainHeading( section );
		var img = mainImage( section );
		if ( ! h || ! img ) {
			return null;
		}
		return {
			dx: img.rect.x + img.rect.w / 2 - ( h.rect.x + h.rect.w / 2 ),
			dy: img.rect.y + img.rect.h / 2 - ( h.rect.y + h.rect.h / 2 ),
		};
	}

	// Sections that show prices: two or more amounts, such as £00 or $25.
	function pricingCount( model ) {
		return model.sections.filter( function ( s ) {
			return ( s.text.match( /[£$€]\s?\d/g ) || [] ).length >= 2;
		} ).length;
	}

	var TASKS = [
		{
			id: 'heading',
			title: 'Change the heading',
			text: 'Change the main heading at the top of the page so it says: ' + NEW_HEADING,
			check: function ( model, base ) {
				var target = simplify( NEW_HEADING );
				return model.sections.slice( 0, 2 ).some( function ( s ) {
					return s.headings.some( function ( h ) {
						return simplify( h.text ) === target;
					} );
				} );
			},
		},
		{
			id: 'swap',
			title: 'Swap the photo and the text',
			text: 'In the top section of the page, swap the photo and the text around, so each is where the other was.',
			check: function ( model, base ) {
				var before = offset( base.sections[ 0 ] );
				var now = offset( topSection( model, base ) );
				if ( ! before || ! now ) {
					return false;
				}
				// The photo has to cross over to the other side of the heading,
				// along the direction they were laid out in.
				var horizontal = Math.abs( before.dx ) >= Math.abs( before.dy );
				var a = horizontal ? before.dx : before.dy;
				var b = horizontal ? now.dx : now.dy;
				return Math.abs( b ) > 40 && a * b < 0;
			},
		},
		{
			id: 'colour',
			title: 'Change a background colour',
			text: 'Give the section just below the top one (the one with three cards) a different background colour.',
			check: function ( model, base ) {
				var was = base.sections[ 1 ];
				var now = byId( model, was.id );
				if ( ! now ) {
					// Replaced (say, by a different layout): find it by its first heading.
					var first = was.headings[ 0 ] && simplify( was.headings[ 0 ].text );
					now = model.sections.filter( function ( s ) {
						return first && s.headings[ 0 ] && simplify( s.headings[ 0 ].text ) === first;
					} )[ 0 ];
				}
				return !! now && now.bg !== was.bg;
			},
		},
		{
			id: 'quote',
			title: 'Add a quote',
			text: 'Add a section with a customer quote straight after the top section.',
			check: function ( model, base ) {
				var top = topSection( model, base );
				var i = model.sections.indexOf( top );
				var next = i >= 0 ? model.sections[ i + 1 ] : null;
				return !! next && next.quote;
			},
		},
		{
			id: 'remove',
			title: 'Remove a section',
			text: 'Remove the section with the prices from the page.',
			check: function ( model, base ) {
				return pricingCount( model ) < pricingCount( base );
			},
		},
	];

	root.StudyTasks = { TASKS: TASKS, NEW_HEADING: NEW_HEADING, pricingCount: pricingCount };
} )( window );
