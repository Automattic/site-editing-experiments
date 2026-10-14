import { Path, SVG } from '@wordpress/primitives';

// Outline heart, for saving a section (Squarespace uses a heart).
export const heart = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M12 20.3 4.6 13a4.7 4.7 0 0 1 0-6.6 4.6 4.6 0 0 1 6.5 0l.9.9.9-.9a4.6 4.6 0 0 1 6.5 0 4.7 4.7 0 0 1 0 6.6L12 20.3Zm-4.2-13.8c-.8 0-1.6.3-2.1.9a3.2 3.2 0 0 0 0 4.5L12 18.2l6.3-6.3a3.2 3.2 0 0 0 0-4.5 3.1 3.1 0 0 0-4.4 0L12 9.3l-1.9-1.9a3 3 0 0 0-2.3-.9Z" />
	</SVG>
);

// Stacked layers, for the "blocks in this section" button.
export const layers = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="m12 3.6 9 4.9-9 4.9-9-4.9 9-4.9Zm0 1.7L6.1 8.5 12 11.7l5.9-3.2L12 5.3Zm-7.3 7.3L12 16.5l7.3-3.9 1.7.9-9 4.9-9-4.9 1.7-.9Zm0 3.6L12 20.1l7.3-3.9 1.7.9-9 4.9-9-4.9 1.7-.9Z" />
	</SVG>
);

export const minus = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M6 11.25h12v1.5H6z" />
	</SVG>
);

// Up/down arrow with lines: drag to change a section's height in rows.
export const rowsHandle = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M6 4.5 3 8h2.25v8H3l3 3.5L9 16H6.75V8H9L6 4.5ZM11 6h10v1.5H11V6Zm0 5.25h10v1.5H11v-1.5Zm0 5.25h10V18H11v-1.5Z" />
	</SVG>
);
