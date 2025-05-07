export interface TranslationSchema {
  get: string;
  addCustomServer: string;
  confirmDeletion: string;
  deleteConfirmation: string;
  cancel: string;
  delete: string;
  install: string;
  addTo: string;
  mcpLinker: string;
  categories: {
    discover: string;
    arcade: string;
    create: string;
    work: string;
    manage: string;
    updates: string;
    favs: string;
    recentlyAdded: string;
  };
  content: {
    discover: string;
    arcade: string;
    create: string;
    work: string;
    manage: string;
    favs: string;
    updates: string;
    recentlyAdded: string;
  };
  featured: {
    title: string;
    description: string;
    button: string;
  };
  featuredServers: string;
  username: string;
  viewProfile: string;
  selectFolder: string;
  search: {
    placeholder: string;
  };
  serverForm: {
    command: string;
    arguments: string;
    env: string;
  };
}
