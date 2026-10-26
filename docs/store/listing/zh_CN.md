芸笺 · Gists Tabs 把 Chrome 的新标签页变成一块你自己排布的工作台。

• 多个页面，把工作、学习和别的事情分开
• 书签小组件带站点图标，按栏目分组
• 把小组件拖到另一栏，再保存
• 世界时钟，同时看你关心的城市
• 从工具栏把当前标签页存进书签组
• 从 Chrome 书签文件夹导入。每个文件夹变成一个书签组。书签权限只在导入时申请
• 浅色 / 深色主题
• 界面有 English、简体中文、繁體中文、日本語、한국어、Español、Português、Deutsch、Français、Русский。没选过时跟随浏览器
• 数据默认只在这台浏览器里，除非你打开同步
• 可选：用你自己的 Token，同步到私人 GitHub Gist
• 画布可以导出、导入 JSON

权限
• storage：把工作台保存在本机
• tabs 和 activeTab：读取当前标签页，方便一键收藏
• alarms：打开云同步之后，按计划重试同步
• bookmarks：可选，只有从 Chrome 书签导入时才申请

Token 只存在扩展的本地存储里，只用来读写你 GitHub 账号下的 Gist。经典个人访问令牌需要 gist 权限；细粒度令牌需要对 Gist 的读写权限。数据不会发到扩展作者的服务器。

源代码：https://github.com/Fuego-Zero/gists-tabs
