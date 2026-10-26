Gists Tabs turns the Chrome new tab into a workspace you arrange yourself.

• Several pages, so work, study, and the rest stay apart
• Bookmark widgets with site icons, grouped into columns
• Drag a widget into another column, then save
• A world clock for the cities you care about
• Save the current tab from the toolbar into a bookmark group
• Import Chrome bookmark folders. Each folder becomes a group. The bookmarks permission is requested only when you import
• Light and dark theme
• Interface in English, 简体中文, 繁體中文, 日本語, 한국어, Español, Português, Deutsch, Français, and Русский. It follows the browser until you choose
• Data stays in this browser unless you turn sync on
• Optional sync to a private GitHub Gist, with your own token
• Export and import the canvas as JSON

Permissions
• storage — keep the workspace on this device
• tabs and activeTab — read the current tab so you can save it in one click
• alarms — retry sync on a schedule after you turn cloud sync on
• bookmarks — optional, only when you import Chrome bookmark folders

The token is stored only in the extension's local storage. It is used to read and write Gists on your GitHub account. A classic personal access token needs the gist scope. A fine-grained token needs read and write access to Gists. Nothing is sent to the extension author's server.

Source code: https://github.com/Fuego-Zero/gists-tabs
