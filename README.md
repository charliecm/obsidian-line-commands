# Obsidian Line Commands

An [Obsidian](https://obsidian.md) plugin that adds the following commands:

- **Select lines:** Selects the lines under the selection or cursor.
- **Copy lines:** Copies the lines under the selection or cursor.
- **Cut lines:** Cuts the lines under the selection or cursor.
- **Paste before line:** Pastes the clipboard text in the line above the cursor.
- **Paste after line:** Pastes the clipboard text in the line below the cursor.
- **Insert line above:** Inserts a new, empty line above the cursor line, continuing any list or checkbox marker.
- **Insert line below:** Inserts a new, empty line below the cursor line, continuing any list or checkbox marker.
- **Duplicate lines:** Copies the lines under the selection and pastes them in the line below the cursor.

<img width="565" alt="Icons for each of the commands listed above" src="https://raw.githubusercontent.com/charliecm/obsidian-line-commands/main/commands.png">

![Demo video](https://raw.githubusercontent.com/charliecm/obsidian-line-commands/main/demo.gif)

I wrote this plugin because I wanted a quick way to cut a line on mobile. However, the default cut command doesn't behave the way it does on desktop (cutting the entire line under the cursor when there's no selection). Therefore, the “cut lines” command makes it easier for me to move lines quickly without needing to painstakingly select lines accurately with my fingers.

You can add these commands to your **toolbar on mobile** to easily access them.

## How to Install

From inside Obsidian…
1. Go to Settings → **Community plugins**.
2. Disable **Safe mode**.
3. Click **Browse**, search for **Line Commands**, and click **Install**.
4. Click the toggle button to enable the plugin.

For manual installation, download this repo and copy over `main.js` and `manifest.json` to your vault: `VaultFolder/.obsidian/plugins/obsidian-line-commands/`.

## Development

1. Clone this repo.
2. `npm install` to install dependencies.
3. `npm run dev` to start compilation in watch mode.
4. `bash install-built.sh /path/to/your/vault -d` to create symbolic links of built files to your vault for quick development.

## Release

1. Run `npm run build`.
2. Run `npm version [patch/minor/major]` to bump version in `manifest.json` and `versions.json`.
3. Add changes in `CHANGELOG.md`.
4. Add a new version tag and push it.
    ```
    git tag -a 1.0.1 -m "1.0.1"
    git push origin 1.0.1
    ```
5. Go to “Releases” in GitHub and edit the latest release (created by GitHub Actions). Insert the changelog texts in the description and ensure `main.js` and `manifest.json` are attached.
6. Click “Publish release”.

## Support

If you really like this plugin and want to support its development, please consider [buying me a coffee](https://www.buymeacoffee.com/charliecm) 🙂 Thanks!

<a href="https://www.buymeacoffee.com/charliecm" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="217" height="60" /></a>
