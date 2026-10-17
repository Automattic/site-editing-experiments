/* eslint-disable no-console */
/**
 * Health check for the user test: opens each editor the way the study does
 * and checks the study can read it, and that none of the tasks counts as done
 * before anyone has touched it. Run it after changing any of the prototypes,
 * since the study reads their pages.
 *
 *   node study/test/health.mjs                 # the published study
 *   STUDY_URL=http://localhost:8000/study/ node study/test/health.mjs
 *   EDITORS=albers,cassatt node study/test/health.mjs
 *
 * Needs Playwright and its browser (npm install, then npx playwright install
 * chromium). Set STUDY_CHROME to use a particular
 * Chrome or Chromium. The WordPress editors start in Playground, so allow a
 * few minutes.
 */
import { chromium } from 'playwright';

const URL = process.env.STUDY_URL || 'https://automattic.github.io/site-editing-experiments/study/';
const EDITORS = ( process.env.EDITORS || 'albers,cassatt,degas,bourgeois,gutenberg' ).split( ',' );

// The full browser rather than the headless shell: closer to what participants use.
const browser = await chromium.launch( process.env.STUDY_CHROME ? { executablePath: process.env.STUDY_CHROME } : { channel: 'chromium' } );
let failures = 0;

for ( const editor of EDITORS ) {
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( e.message ) );
	const started = Date.now();
	try {
		await page.goto( `${ URL }?editors=${ editor }&pid=health-check`, { waitUntil: 'load' } );
		let state = { ready: false };
		while ( ! state.ready && Date.now() - started < 300000 ) {
			await page.waitForTimeout( 2000 );
			state = await page.evaluate( ( e ) => window.studyCheck( e ), editor );
		}
		const problems = [];
		if ( ! state.ready ) {
			problems.push( 'never became ready' );
		} else {
			if ( state.sections < 6 ) {
				problems.push( `only ${ state.sections } sections` );
			}
			if ( state.pricing < 1 ) {
				problems.push( 'no section with prices' );
			}
			if ( state.done.some( Boolean ) ) {
				problems.push( 'tasks already done: ' + state.done.map( ( d, i ) => ( d ? i + 1 : null ) ).filter( Boolean ).join( ', ' ) );
			}
			const top = state.model.sections[ 0 ];
			if ( ! top.headings.length || ! top.images.length ) {
				problems.push( 'the top section has no heading or no photo' );
			}
		}
		if ( errors.length ) {
			problems.push( 'script errors: ' + errors.join( ' | ' ) );
		}
		const secs = Math.round( ( Date.now() - started ) / 1000 );
		if ( problems.length ) {
			failures++;
			console.log( `  ✗ ${ editor } (${ secs }s): ${ problems.join( '; ' ) }` );
		} else {
			console.log( `  ✓ ${ editor } (${ secs }s): ${ state.sections } sections, nothing done yet` );
		}
	} catch ( e ) {
		failures++;
		console.log( `  ✗ ${ editor }: ${ e.message.split( '\n' )[ 0 ] }` );
	}
	await page.close();
}

await browser.close();
console.log( failures ? `\n${ failures } failed` : '\nAll editors ready for the study' );
process.exit( failures ? 1 : 0 );
