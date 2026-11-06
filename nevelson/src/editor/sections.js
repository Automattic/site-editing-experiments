/**
 * Always the block's own settings. In WordPress 7, blocks from a pattern or a
 * template part are in a "section": clicking one selects the section, or the
 * inspector shows the section's settings, until you edit the section. Here
 * the panel is beside the block you clicked, so it should be that block's.
 * Nevelson edits the section for you and selects the block you clicked.
 */
import { store as blockEditorStore } from '@wordpress/block-editor';

const SECTION_BLOCKS = [ 'core/template-part', 'core/block' ];

// Whether a block makes a section: a template part, a synced pattern, a
// block inserted from a pattern, or a block locked to its content.
function isSection( be, id ) {
	const attributes = be.getBlockAttributes( id ) || {};
	return (
		SECTION_BLOCKS.includes( be.getBlockName( id ) ) ||
		!! attributes.metadata?.patternName ||
		attributes.templateLock === 'contentOnly'
	);
}

/**
 * The section a block is in: its outermost ancestor that makes one, as
 * sections inside sections are edited with the outer one.
 *
 * @param {Object} be       The block editor's selectors.
 * @param {string} clientId The block.
 * @return {string|null} The section, or null.
 */
export function sectionOf( be, clientId ) {
	return (
		be.getBlockParents( clientId ).find( ( id ) => isSection( be, id ) ) ||
		null
	);
}

// How long after a click its selection is still the click's.
const CLICK_MS = 1200;

/**
 * Watches clicks in the canvas and the selection, and when the selected
 * block's settings wouldn't be its own, edits its section and selects it.
 *
 * @param {Object} registry The data registry.
 * @return {Object} onPointerDown, for every pointerdown in the canvas; swallow, whether to keep a mouse event from the editor; and check, to call after clicks and selections.
 */
export function createSectionEntry( registry ) {
	let clicked = null;
	let clickedAt = 0;

	const check = () => {
		const be = registry.select( blockEditorStore );
		if ( be.getMultiSelectedBlockClientIds().length ) {
			return;
		}
		const recent = clicked && Date.now() - clickedAt < CLICK_MS;
		let selected = be.getSelectedBlockClientId();
		// A click outside the section being edited leaves it, and selects
		// nothing: select what was clicked.
		if ( ! selected && recent && be.getBlock( clicked ) ) {
			registry.dispatch( blockEditorStore ).selectBlock( clicked );
			selected = clicked;
		}
		if ( ! selected ) {
			return;
		}
		// A click inside a section selects the section: use the block that
		// was clicked.
		let target = selected;
		if (
			recent &&
			clicked !== selected &&
			be.getBlockParents( clicked ).includes( selected )
		) {
			target = clicked;
		}
		if (
			target === selected &&
			be.getBlockEditingMode( target ) === 'default'
		) {
			return;
		}
		const section = sectionOf( be, target );
		if ( ! section ) {
			return;
		}
		const dispatch = registry.dispatch( blockEditorStore );
		if ( be.getBlockEditingMode( target ) !== 'default' ) {
			// Public, if deprecated: the same as Edit section.
			dispatch.__unstableSetTemporarilyEditingAsBlocks( section );
			entered = section;
		}
		if ( be.getSelectedBlockClientId() !== target ) {
			dispatch.selectBlock( target );
		}
	};

	// The section Nevelson last opened, and until when to keep a click from
	// the editor once Nevelson has handled it.
	let entered = null;
	let swallowUntil = 0;

	// The innermost block under the pointer. Blocks outside the open
	// section don't take the pointer, so go by their boxes: the last block
	// in the document with the point in its box is the innermost.
	const blockAt = ( event ) => {
		const doc = event.target?.ownerDocument;
		if ( ! doc ) {
			return null;
		}
		let found = null;
		for ( const el of doc.querySelectorAll( '[data-block]' ) ) {
			const r = el.getBoundingClientRect();
			if (
				event.clientX >= r.left &&
				event.clientX <= r.right &&
				event.clientY >= r.top &&
				event.clientY <= r.bottom
			) {
				found = el.dataset.block;
			}
		}
		return found;
	};

	/**
	 * For every pointerdown in the canvas. While a section is open, the rest
	 * of the page is under an overlay, and a click on it leaves the section
	 * and selects nothing. Instead, open the clicked block's section and
	 * select it, and keep the click from the editor.
	 *
	 * @param {PointerEvent} event
	 * @return {boolean} Whether Nevelson handled the click.
	 */
	const onPointerDown = ( event ) => {
		clicked = blockAt( event );
		clickedAt = Date.now();
		const be = registry.select( blockEditorStore );
		if (
			! clicked ||
			! entered ||
			! be.getBlock( entered ) ||
			clicked === entered ||
			be.getBlockParents( clicked ).includes( entered ) ||
			be.getBlockEditingMode( clicked ) !== 'disabled'
		) {
			return false;
		}
		const dispatch = registry.dispatch( blockEditorStore );
		const section = sectionOf( be, clicked );
		dispatch.__unstableSetTemporarilyEditingAsBlocks( section );
		entered = section;
		if ( be.getBlockEditingMode( clicked ) === 'disabled' ) {
			// Not something that can be edited here, such as a template
			// part on a page: just leave the section.
			dispatch.__unstableSetTemporarilyEditingAsBlocks( null );
			entered = null;
			dispatch.clearSelectedBlock();
		} else {
			dispatch.selectBlock( clicked );
		}
		swallowUntil = Date.now() + 700;
		return true;
	};

	// Whether to keep this mouse event from the editor: the rest of a click
	// Nevelson has handled.
	const swallow = () => Date.now() < swallowUntil;

	return { onPointerDown, check, swallow };
}
