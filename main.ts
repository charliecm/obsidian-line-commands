import { Editor, EditorPosition, Notice, Plugin } from 'obsidian';

function getLineRange(editor: Editor) {
	const startLine = editor.getCursor('from').line;
	const endLine = editor.getCursor('to').line;
	const endLineCh = editor.getLine(endLine).length;
	const rangeStart = { line: startLine, ch: 0 };
	const rangeEnd = { line: endLine, ch: endLineCh };
	return { startLine, endLine, rangeStart, rangeEnd };
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

export default class ObsidianLineCommands extends Plugin {
	async onload() {
		this.addCommand({
			id: 'select-lines',
			name: 'Select lines',
			icon: 'text-cursor-input',
			editorCallback: async (editor: Editor) => {
				const { rangeStart, rangeEnd } = getLineRange(editor);
				editor.setSelection(rangeStart, rangeEnd);
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
				editor.setLine(currentLine, clipboardText + '\n' + currentText);
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
				editor.setLine(currentLine, currentText + '\n' + clipboardText);
			},
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
