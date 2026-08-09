import { Editor, EditorPosition, Notice, Plugin } from 'obsidian';

function getLineRange(editor: Editor) {
	const from = editor.getCursor('from');
	const to = editor.getCursor('to');
	const startLine = from.line;
	const endLine = to.line;
	const endLineCh = editor.getLine(endLine).length;
	const rangeStart = { line: startLine, ch: 0 };
	const rangeEnd = { line: endLine, ch: endLineCh };
	return { from, to, startLine, endLine, rangeStart, rangeEnd };
}

function getLineRemovalRange(
	editor: Editor,
	startLine: number,
	endLine: number,
	rangeStart: EditorPosition,
	rangeEnd: EditorPosition,
) {
	if (endLine < editor.lastLine()) {
		return { removalStart: rangeStart, removalEnd: { line: endLine + 1, ch: 0 } };
	}
	if (startLine === 0) {
		return { removalStart: rangeStart, removalEnd: rangeEnd };
	}
	const previousLineEnd = { line: startLine - 1, ch: editor.getLine(startLine - 1).length };
	return { removalStart: previousLineEnd, removalEnd: rangeEnd };
}

function getPasteEndCursor(baseLine: number, clipboardLines: string[]): EditorPosition {
	return {
		line: baseLine + clipboardLines.length - 1,
		ch: clipboardLines[clipboardLines.length - 1]!.length,
	};
}

function getLineContinuation(line: string): string {
	if (line.trim() === '') return '';

	const taskMatch = line.match(/^(\s*)([-*+])\s+\[[ xX]\]\s*/);
	if (taskMatch) return `${taskMatch[1]}${taskMatch[2]} [ ] `;

	const orderedMatch = line.match(/^(\s*)(\d+)\.\s+/);
	if (orderedMatch) return `${orderedMatch[1]}${parseInt(orderedMatch[2]!, 10) + 1}. `;

	const unorderedMatch = line.match(/^(\s*)([-*+])\s+/);
	if (unorderedMatch) return `${unorderedMatch[1]}${unorderedMatch[2]} `;

	const indentMatch = line.match(/^(\s+)/);
	if (indentMatch) return indentMatch[1]!;

	return '';
}

function insertContinuedLine(editor: Editor, position: 'above' | 'below') {
	const currentLine = editor.getCursor().line;
	const line = editor.getLine(currentLine);
	const continuation = getLineContinuation(line);
	if (position === 'above') {
		editor.replaceRange(continuation + '\n', { line: currentLine, ch: 0 });
		editor.setCursor({ line: currentLine, ch: continuation.length });
	} else {
		editor.replaceRange('\n' + continuation, { line: currentLine, ch: line.length });
		editor.setCursor({ line: currentLine + 1, ch: continuation.length });
	}
}

export default class ObsidianLineCommands extends Plugin {
	async onload() {
		this.addCommand({
			id: 'select-lines',
			name: 'Select lines',
			icon: 'text-cursor-input',
			editorCallback: async (editor: Editor) => {
				const { from, to, endLine, rangeStart, rangeEnd } = getLineRange(editor);
				const lastLine = editor.lastLine();

				// If the current line(s) are already fully selected, extend the
				// selection to include the next line down on each invocation.
				// A collapsed cursor on an empty line trivially matches the
				// full-line bounds, so require an actual selection as well.
				const hasSelection = from.line !== to.line || from.ch !== to.ch;
				const fullySelected = hasSelection && from.ch === 0 && to.ch === rangeEnd.ch;
				const finalRangeEnd =
					fullySelected && endLine < lastLine
						? { line: endLine + 1, ch: editor.getLine(endLine + 1).length }
						: rangeEnd;
				editor.setSelection(rangeStart, finalRangeEnd);
			},
		});

		this.addCommand({
			id: 'copy-lines',
			name: 'Copy lines',
			icon: 'copy-minus',
			editorCallback: async (editor: Editor) => {
				const { rangeStart, rangeEnd } = getLineRange(editor);
				const text = editor.getRange(rangeStart, rangeEnd);
				await this.copyToClipboard(text);
			},
		});

		this.addCommand({
			id: 'cut-lines',
			name: 'Cut lines',
			icon: 'scissors-line-dashed',
			editorCallback: async (editor: Editor) => {
				const { startLine, endLine, rangeStart, rangeEnd } = getLineRange(editor);
				const text = editor.getRange(rangeStart, rangeEnd);
				const { removalStart, removalEnd } = getLineRemovalRange(editor, startLine, endLine, rangeStart, rangeEnd);
				editor.replaceRange('', removalStart, removalEnd);
				await this.copyToClipboard(text);
			},
		});

		this.addCommand({
			id: 'paste-before-line',
			name: 'Paste before line',
			icon: 'clipboard-copy',
			editorCallback: async (editor: Editor) => {
				const currentLine = editor.getCursor('from').line;
				const currentText = editor.getLine(currentLine);
				const clipboardText = await navigator.clipboard.readText();
				const clipboardLines = clipboardText.split('\n');
				editor.setLine(currentLine, clipboardText + '\n' + currentText);

				// Editors don't reliably keep the cursor anchored to the original
				// line when its containing range is replaced, so place it
				// explicitly at the end of the pasted text.
				const pasteEnd = getPasteEndCursor(currentLine, clipboardLines);
				editor.setSelection(pasteEnd, pasteEnd);
			},
		});

		this.addCommand({
			id: 'paste-after-line',
			name: 'Paste after line',
			icon: 'clipboard-paste',
			editorCallback: async (editor: Editor) => {
				const currentLine = editor.getCursor('from').line;
				const currentText = editor.getLine(currentLine);
				const clipboardText = await navigator.clipboard.readText();
				const clipboardLines = clipboardText.split('\n');
				editor.setLine(currentLine, currentText + '\n' + clipboardText);

				// Editors don't reliably keep the cursor anchored to the original
				// line when its containing range is replaced, so place it
				// explicitly at the end of the pasted text.
				const pasteEnd = getPasteEndCursor(currentLine + 1, clipboardLines);
				editor.setSelection(pasteEnd, pasteEnd);
			},
		});

		this.addCommand({
			id: 'insert-line-above',
			name: 'Insert line above',
			icon: 'between-horizontal-end',
			editorCallback: async (editor: Editor) => insertContinuedLine(editor, 'above'),
		});

		this.addCommand({
			id: 'insert-line-below',
			name: 'Insert line below',
			icon: 'between-horizontal-start',
			editorCallback: async (editor: Editor) => insertContinuedLine(editor, 'below'),
		});

		this.addCommand({
			id: 'duplicate-lines',
			name: 'Duplicate lines',
			icon: 'copy',
			editorCallback: async (editor: Editor) => {
				const { startLine, endLine, rangeStart, rangeEnd } = getLineRange(editor);
				const text = editor.getRange(rangeStart, rangeEnd);
				editor.replaceRange(text + '\n' + text, rangeStart, rangeEnd);

				// Select the duplicated text
				const selectionStart = { line: endLine + 1, ch: 0 };
				const selectionEnd = {
					line: endLine + (endLine - startLine) + 1,
					ch: rangeEnd.ch,
				};
				editor.setSelection(selectionStart, selectionEnd);
			},
		});
	}

	async copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch (error) {
			console.error(error instanceof Error ? error.message : error);
			new Notice('Unable to copy lines to clipboard.');
		}
	}
}
