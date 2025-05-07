import { TranslationSchema } from "../schema";

const en: { translation: TranslationSchema } = {
  translation: {
    get: "Get",
    addCustomServer: "Add Custom server",
    confirmDeletion: "Confirm Deletion",
    deleteConfirmation: "Are you sure you want to delete {{serverKey}}?",
    cancel: "Cancel",
    delete: "Delete",
    install: "Install",
    addTo: "Add to",
    mcpLinker: "MCP Linker",
    categories: {
      discover: "Discover",
      arcade: "Arcade",
      create: "Create",
      favs: "Favorites",
      work: "Work",
      manage: "Manage",
      updates: "Updates",
      recentlyAdded: "Recently Added",
    },
    content: {
      discover: "Discover featured content",
      arcade: "Apple Arcade games",
      create: "Creative servers",
      work: "Productivity servers",
      manage: "Manage",
      favs: "Favorites",
      updates: "Server updates",
      recentlyAdded: "Recently added servers",
    },
    featured: {
      title: "Featured Server of the Week",
      description: "Explore servers handpicked by our editors",
      button: "View Details",
    },
    featuredServers: "Featured Servers",
    username: "Username",
    viewProfile: "View Profile",
    selectFolder: "Select Folder",
    search: {
      placeholder: "Search servers by name...",
    },
    serverForm: {
      command: "Command",
      arguments: "Arguments",
      env: "Environment Variables",
    },
  },
};

export default en;
