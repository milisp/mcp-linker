import { TranslationSchema } from "../schema";

const ja: { translation: TranslationSchema } = {
  translation: {
    get: "取得",
    addCustomServer: "Add Custom server",
    confirmDeletion: "Confirm Deletion",
    deleteConfirmation: "Are you sure you want to delete {{serverKey}}?",
    cancel: "Cancel",
    delete: "Delete",
    install: "インストール",
    addTo: "追加",
    mcpLinker: "MCP Linker",
    categories: {
      discover: "発見",
      arcade: "アーケード",
      create: "作成",
      work: "仕事",
      manage: "管理",
      updates: "アップデート",
      recentlyAdded: "最近追加",
      favs: "お気に入り", // <-- 新增
    },
    content: {
      discover: "注目のコンテンツを発見",
      arcade: "Apple Arcadeのゲーム",
      create: "クリエイティブサーバー",
      work: "生産性向上サーバー",
      manage: "管理",
      updates: "サーバーの更新",
      recentlyAdded: "最近追加されたサーバー",
      favs: "お気に入り", // <-- 新增
    },
    featured: {
      title: "今週の注目アプリ",
      description: "編集者が厳選したアプリをチェック",
      button: "詳細を見る",
    },
    featuredServers: "注目サーバー",
    username: "ユーザー名",
    viewProfile: "プロフィールを見る",
    selectFolder: "フォルダを選択",
    search: {
      placeholder: "名前でサーバーを検索...",
    },
    serverForm: {
      command: "Command",
      arguments: "Arguments",
      env: "Environment Variables",
    },
  },
};

export default ja;
