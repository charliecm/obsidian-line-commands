import { beforeEach, describe, expect, it, vi } from 'vitest';

type Point = { line: number; ch: number };
type Command = {
	id: string;
	name: string;
	icon: string;
	editorCallback: (editor: TestEditor) => Promise<void>;
};

const { commands, notices } = vi.hoisted(() => ({
	commands: [] as Command[],
	notices: [] as string[],
}));

vi.mock('obsidian', () => ({
	Plugin: class {
		addCommand(command: Command) {
			commands.push(command);
		}
	},
	Notice: class {
		constructor(message: string) {
			notices.push(message);
		}
	},
}));

import ObsidianLineCommands from './main';

class TestEditor {
	private lines: string[];
	private from: Point;
	private to: Point;
	selection?: { from: Point; to: Point };

	constructor(text: string, from: Point, to = from) {
		this.lines = text.split('\n');
		this.from = from;
		this.to = to;
	}

	get text() {
		return this.lines.join('\n');
	}

	getCursor(which: 'from' | 'to') {
		return which === 'from' ? this.from : this.to;
	}

	getLine(line: number) {
		return this.lines[line];
	}

	lastLine() {
		return this.lines.length - 1;
	}

	getRange(from: Point, to: Point) {
		return this.text.slice(this.offset(from), this.offset(to));
	}

	replaceRange(replacement: string, from: Point, to: Point) {
		const text = this.text;
		this.lines = (text.slice(0, this.offset(from)) + replacement + text.slice(this.offset(to))).split('\n');
	}

	setLine(line: number, text: string) {
		this.lines.splice(line, 1, ...text.split('\n'));
	}

	setSelection(from: Point, to: Point) {
		this.selection = { from, to };
	}

	getSelection() {
		return this.selection;
	}

	private offset(point: Point) {
		const line = Math.min(point.line, this.lines.length - 1);
		const ch = Math.min(point.ch, this.lines[line]!.length);
		return this.lines.slice(0, line).reduce((offset, current) => offset + current.length + 1, 0) + ch;
	}
}

function getCommand(id: string) {
	const command = commands.find((candidate) => candidate.id === id);
	expect(command).toBeDefined();
	return command!;
}

function setClipboard(readText = vi.fn<() => Promise<string>>(), writeText = vi.fn<() => Promise<void>>()) {
	vi.stubGlobal('navigator', { clipboard: { readText, writeText } });
	return { readText, writeText };
}

describe('ObsidianLineCommands', () => {
	let plugin: ObsidianLineCommands;

	beforeEach(async () => {
		commands.length = 0;
		notices.length = 0;
		vi.restoreAllMocks();
		setClipboard();
		plugin = new ObsidianLineCommands({} as never, {} as never);
		await plugin.onload();
	});

	it('registers the six documented editor commands', () => {
		expect(commands.map(({ id, name, icon }) => ({ id, name, icon }))).toEqual([
			{ id: 'select-lines', name: 'Select lines', icon: 'text-cursor-input' },
			{ id: 'copy-lines', name: 'Copy lines', icon: 'copy-minus' },
			{ id: 'cut-lines', name: 'Cut lines', icon: 'scissors-line-dashed' },
			{ id: 'paste-before-line', name: 'Paste before line', icon: 'clipboard-copy' },
			{ id: 'paste-after-line', name: 'Paste after line', icon: 'clipboard-paste' },
			{ id: 'duplicate-lines', name: 'Duplicate lines', icon: 'copy' },
		]);
	});

	it('selects the complete line at a collapsed cursor, including an empty line', async () => {
		const editor = new TestEditor('first\n\nthird', { line: 1, ch: 0 });

		await getCommand('select-lines').editorCallback(editor);

		expect(editor.getSelection()).toEqual({ from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 } });
	});

	it('selects complete lines for a multi-line selection', async () => {
		const editor = new TestEditor('first\nsecond\nthird', { line: 0, ch: 3 }, { line: 2, ch: 1 });

		await getCommand('select-lines').editorCallback(editor);

		expect(editor.getSelection()).toEqual({ from: { line: 0, ch: 0 }, to: { line: 2, ch: 5 } });
	});

	it('extends the selection to the next line when the current line is already fully selected', async () => {
		const editor = new TestEditor('first\nsecond\nthird', { line: 0, ch: 0 }, { line: 0, ch: 5 });

		await getCommand('select-lines').editorCallback(editor);

		expect(editor.getSelection()).toEqual({ from: { line: 0, ch: 0 }, to: { line: 1, ch: 6 } });
	});

	it('extends an already fully selected multi-line range by one more line on repeated invocation', async () => {
		const editor = new TestEditor('first\nsecond\nthird\nfourth', { line: 0, ch: 0 }, { line: 1, ch: 6 });

		await getCommand('select-lines').editorCallback(editor);

		expect(editor.getSelection()).toEqual({ from: { line: 0, ch: 0 }, to: { line: 2, ch: 5 } });
	});

	it('stops extending once the fully selected range already reaches the last line', async () => {
		const editor = new TestEditor('first\nsecond', { line: 0, ch: 0 }, { line: 1, ch: 6 });

		await getCommand('select-lines').editorCallback(editor);

		expect(editor.getSelection()).toEqual({ from: { line: 0, ch: 0 }, to: { line: 1, ch: 6 } });
	});

	it('extends a fully selected range that ends on an empty line', async () => {
		const editor = new TestEditor('first\n\nthird', { line: 0, ch: 0 }, { line: 1, ch: 0 });

		await getCommand('select-lines').editorCallback(editor);

		expect(editor.getSelection()).toEqual({ from: { line: 0, ch: 0 }, to: { line: 2, ch: 5 } });
	});

	it('does not extend a collapsed cursor on an empty line, since nothing is actually selected yet', async () => {
		const editor = new TestEditor('first\n\nthird', { line: 1, ch: 0 }, { line: 1, ch: 0 });

		await getCommand('select-lines').editorCallback(editor);

		expect(editor.getSelection()).toEqual({ from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 } });
	});

	it('copies complete selected lines without changing the editor', async () => {
		const { writeText } = setClipboard(undefined, vi.fn().mockResolvedValue(undefined));
		const editor = new TestEditor('first\nsecond\nthird', { line: 0, ch: 2 }, { line: 1, ch: 4 });

		await getCommand('copy-lines').editorCallback(editor);

		expect(writeText).toHaveBeenCalledWith('first\nsecond');
		expect(editor.text).toBe('first\nsecond\nthird');
	});

	it('shows a notice when copying to the clipboard fails', async () => {
		const error = new Error('Clipboard denied');
		const { writeText } = setClipboard(undefined, vi.fn().mockRejectedValue(error));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const editor = new TestEditor('first', { line: 0, ch: 2 });

		await getCommand('copy-lines').editorCallback(editor);

		expect(writeText).toHaveBeenCalledWith('first');
		expect(consoleError).toHaveBeenCalledWith('Clipboard denied');
		expect(notices).toEqual(['Unable to copy lines to clipboard.']);
		expect(editor.text).toBe('first');
	});

	it('cuts selected lines and copies their text', async () => {
		const { writeText } = setClipboard(undefined, vi.fn().mockResolvedValue(undefined));
		const editor = new TestEditor('first\nsecond\nthird', { line: 1, ch: 2 });

		await getCommand('cut-lines').editorCallback(editor);

		expect(writeText).toHaveBeenCalledWith('second');
		expect(editor.text).toBe('first\nthird');
	});

	it('cuts the final line without leaving a trailing newline', async () => {
		const { writeText } = setClipboard(undefined, vi.fn().mockResolvedValue(undefined));
		const editor = new TestEditor('first\nsecond', { line: 1, ch: 0 });

		await getCommand('cut-lines').editorCallback(editor);

		expect(writeText).toHaveBeenCalledWith('second');
		expect(editor.text).toBe('first');
	});

	it('pastes multi-line clipboard text before the cursor line', async () => {
		const { readText } = setClipboard(vi.fn().mockResolvedValue('before\ntext'));
		const editor = new TestEditor('first\nsecond\nthird', { line: 1, ch: 2 }, { line: 2, ch: 1 });

		await getCommand('paste-before-line').editorCallback(editor);

		expect(readText).toHaveBeenCalledOnce();
		expect(editor.text).toBe('first\nbefore\ntext\nsecond\nthird');
		expect(editor.getSelection()).toEqual({ from: { line: 2, ch: 4 }, to: { line: 2, ch: 4 } });
	});

	it('pastes clipboard text after an empty cursor line', async () => {
		const { readText } = setClipboard(vi.fn().mockResolvedValue('after'));
		const editor = new TestEditor('first\n\nthird', { line: 1, ch: 0 });

		await getCommand('paste-after-line').editorCallback(editor);

		expect(readText).toHaveBeenCalledOnce();
		expect(editor.text).toBe('first\n\nafter\nthird');
		expect(editor.getSelection()).toEqual({ from: { line: 2, ch: 5 }, to: { line: 2, ch: 5 } });
	});

	it('places the cursor at the end of the pasted text when pasting after a line, even when the cursor started before the end of that line', async () => {
		const { readText } = setClipboard(vi.fn().mockResolvedValue('pasted'));
		const editor = new TestEditor('first\nsecond\nthird', { line: 1, ch: 2 });

		await getCommand('paste-after-line').editorCallback(editor);

		expect(readText).toHaveBeenCalledOnce();
		expect(editor.text).toBe('first\nsecond\npasted\nthird');
		expect(editor.getSelection()).toEqual({ from: { line: 2, ch: 6 }, to: { line: 2, ch: 6 } });
	});

	it('does not change the editor when reading the clipboard fails', async () => {
		const error = new Error('Clipboard denied');
		setClipboard(vi.fn().mockRejectedValue(error));
		const editor = new TestEditor('first\nsecond', { line: 1, ch: 0 });

		await expect(getCommand('paste-before-line').editorCallback(editor)).rejects.toThrow(error);
		expect(editor.text).toBe('first\nsecond');
	});

	it('duplicates multi-line selections and selects only the inserted copy', async () => {
		const editor = new TestEditor('first\nsecond\nthird\nfourth', { line: 1, ch: 2 }, { line: 2, ch: 3 });

		await getCommand('duplicate-lines').editorCallback(editor);

		expect(editor.text).toBe('first\nsecond\nthird\nsecond\nthird\nfourth');
		expect(editor.getSelection()).toEqual({ from: { line: 3, ch: 0 }, to: { line: 4, ch: 5 } });
	});

	it('duplicates an empty line and selects the inserted empty line', async () => {
		const editor = new TestEditor('first\n\nthird', { line: 1, ch: 0 });

		await getCommand('duplicate-lines').editorCallback(editor);

		expect(editor.text).toBe('first\n\n\nthird');
		expect(editor.getSelection()).toEqual({ from: { line: 2, ch: 0 }, to: { line: 2, ch: 0 } });
	});
});
