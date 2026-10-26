Gists Tabs fait du nouvel onglet Chrome un espace que vous organisez vous-même.

• Plusieurs pages, pour séparer travail, études et le reste
• Des widgets de marque-pages avec icônes, regroupés en colonnes
• Glissez un widget dans une autre colonne, puis enregistrez
• Une horloge mondiale pour les villes qui vous intéressent
• Enregistrez l’onglet ouvert depuis la barre d’outils
• Importez des dossiers de marque-pages Chrome. Chaque dossier devient un groupe. L’autorisation n’est demandée qu’à l’import
• Thème clair et sombre
• Interface en English, 简体中文, 繁體中文, 日本語, 한국어, Español, Português, Deutsch, Français et Русский. Elle suit le navigateur tant que vous n’avez pas choisi
• Les données restent dans ce navigateur, sauf si vous activez la synchronisation
• Synchronisation facultative vers un Gist GitHub privé, avec votre jeton
• Exportez et importez le canevas en JSON

Autorisations
• storage — conserver l’espace de travail sur cet appareil
• tabs et activeTab — lire l’onglet ouvert pour l’enregistrer en un clic
• alarms — réessayer la synchronisation après l’activation du cloud
• bookmarks — facultative, seulement pour importer les marque-pages Chrome

Le jeton est stocké uniquement dans le stockage local de l’extension. Il sert à lire et écrire les Gists de votre compte GitHub. Un jeton classique a besoin du scope gist. Un jeton affiné a besoin d’un accès en lecture et en écriture aux Gists. Rien n’est envoyé au serveur de l’auteur de l’extension.

Code source : https://github.com/Fuego-Zero/gists-tabs
