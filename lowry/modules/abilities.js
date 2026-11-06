/**
 * Hands the Abilities API's client to Lowry's editor script.
 *
 * `@wordpress/abilities` is a script module, and the editor script is a
 * classic script that can't import one, so this module imports it and puts
 * it on `window.lowryAbilities`, then fires `lowry-abilities`. Both imports
 * are dynamic: where WordPress doesn't have the client, this still loads, and
 * says so with `{ available: false }`.
 */
let detail = { available: false };
try {
	const abilities = await import( '@wordpress/abilities' );
	let ready = Promise.resolve();
	try {
		// Registers the server's abilities on the client, from the REST API.
		const core = await import( '@wordpress/core-abilities' );
		ready = core.ready || ready;
	} catch ( e ) {
		// Client-side abilities still work without the server's.
	}
	detail = { available: true, abilities, ready };
} catch ( e ) {
	detail = { available: false, reason: String( e && e.message ) };
}
window.lowryAbilities = detail;
window.dispatchEvent( new CustomEvent( 'lowry-abilities', { detail } ) );
