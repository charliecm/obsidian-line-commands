import { Editor, Notice, Plugin } from 'obsidian';

export default class ObsidianLineCommands extends Plugin {
	async onload() {
		this.addCommand({
			id: 'select-lines',
			name: 'Select lines',
			icon: 'text-cursor-input',
			editorCallback: async (editor: Editor) => {
				const startLine = editor.getCursor('from').line;
				const endLine = editor.getCursor('to').line;
				const endLineCh = editor.getLine(endLine).length;
				const rangeStart = { line: startLine, ch: 0 };
				const rangeEnd = { line: endLine, ch: endLineCh };
				editor.setSelection(rangeStart, rangeEnd);
			}
		});

		this.addCommand({
			id: 'copy-lines',
			name: 'Copy lines',
			icon: 'copy-minus',
			editorCallback: async (editor: Editor) => {
				const startLine = editor.getCursor('from').line;
				const endLine = editor.getCursor('to').line;
				const endLineCh = editor.getLine(endLine).length;
				const rangeStart = { line: startLine, ch: 0 };
				const rangeEnd = { line: endLine, ch: endLineCh };
				const text = editor.getRange(rangeStart, rangeEnd);
				this.copyToClipboard(text);
			}
		});

		this.addCommand({
			id: 'cut-lines',
			name: 'Cut lines',
			icon: 'scissors-line-dashed',
			editorCallback: async (editor: Editor) => {
				const startLine = editor.getCursor('from').line;
				const endLine = editor.getCursor('to').line;
				const endLineCh = editor.getLine(endLine).length;
				const rangeStart = { line: startLine, ch: 0 };
				const rangeEnd = { line: endLine, ch: endLineCh };
				const text = editor.getRange(rangeStart, rangeEnd);
				const rangeEndNextLine = { line: endLine + 1, ch: 0 };
				editor.replaceRange('', rangeStart, rangeEndNextLine);
				this.copyToClipboard(text);
			}
		});

		this.addCommand({
			id: 'paste-before-line',
			name: 'Paste before line',
			icon: 'clipboard-copy',
			editorCallback: async (editor: Editor) => {
				const currentLine = editor.getCursor('from').line;
				const currentText = editor.getLine(currentLine);
				const clipboardText = await navigator.clipboard.readText();
				editor.setLine(currentLine, clipboardText + "\n" + currentText);
			}
		});

		this.addCommand({
			id: 'paste-after-line',
			name: 'Paste after line',
			icon: 'clipboard-paste',
			editorCallback: async (editor: Editor) => {
				const currentLine = editor.getCursor('from').line;
				const currentText = editor.getLine(currentLine);
				const clipboardText = await navigator.clipboard.readText();
				editor.setLine(currentLine, currentText + "\n" + clipboardText);
			}
		});

		this.addCommand({
			id: 'copy-lines-down',
			name: 'Copy lines down',
			icon: 'clipboard-paste',
			editorCallback: async (editor: Editor) => {
				const startLine = editor.getCursor('from').line;
				const endLine = editor.getCursor('to').line;
				const endLineCh = editor.getLine(endLine).length;
				const rangeStart = { line: startLine, ch: 0 };
				const rangeEnd = { line: endLine, ch: endLineCh };
				const text = editor.getRange(rangeStart, rangeEnd);
				editor.setLine(endLine, text + "\n" + text);
			}
		});

		this.addCommand({
			id: 'copy-lines-up',
			name: 'Copy lines up',
			icon: 'clipboard-paste',
			editorCallback: async (editor: Editor) => {
				const startLine = editor.getCursor('from').line;
				const endLine = editor.getCursor('to').line;
				const endLineCh = editor.getLine(endLine).length;
				const rangeStart = { line: startLine, ch: 0 };
				const rangeEnd = { line: endLine, ch: endLineCh };
				const text = editor.getRange(rangeStart, rangeEnd);
				editor.setLine(startLine, text + "\n" + text);
			}
		});
	}

	async copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch (error) {
			console.error(error.message);
			new Notice('Unable to copy lines to clipboard.');
		}
	}
}