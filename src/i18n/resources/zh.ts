import { TranslationSchema } from "../schema";

const zh: { translation: TranslationSchema } = {
  translation: {
    get: "获取",
    addCustomServer: "添加定制的服务器",
    confirmDeletion: "确认删除",
    deleteConfirmation: "您确定要删除{{serverKey}}吗？",
    cancel: "取消",
    delete: "删除",
    install: "安装",
    addTo: "添加到",
    mcpLinker: "MCP Linker",
    categories: {
      discover: "发现",
      arcade: "Arcade",
      create: "创作",
      work: "工作",
      manage: "管理",
      updates: "更新",
      recentlyAdded: "最近添加",
      favs: "收藏", // <-- 新增
    },
    content: {
      discover: "发现精选内容",
      arcade: "Apple Arcade 游戏",
      create: "创作类服务器",
      work: "办公效率服务器",
      manage: "管理",
      updates: "服务器更新",
      recentlyAdded: "最近添加的服务器",
      favs: "收藏夹", // <-- 新增
    },
    featured: {
      title: "本周精选服务器",
      description: "探索由编辑精心挑选的精彩服务器",
      button: "查看详情",
    },
    featuredServers: "精选服务器",
    username: "用户名",
    viewProfile: "查看个人资料",
    selectFolder: "选择文件夹",
    search: {
      placeholder: "搜索服务器",
    },
    serverForm: {
      command: "命令",
      arguments: "参数",
      env: "环境变量",
    },
  },
};

export default zh;
