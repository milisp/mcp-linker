import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-shell";
import { ModeToggle } from "./mode-toggle";
import { Category } from "@/types";

interface SidebarProps {
  appCategories: Category[];
  selectedCategory: Category;
  setSelectedCategory: React.Dispatch<React.SetStateAction<Category>>;
}

export const Sidebar = ({
  appCategories,
  selectedCategory,
  setSelectedCategory,
}: SidebarProps) => {
  const { t } = useTranslation<"translation">();

  return (
    <div className="w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex gap-2 cursor-pointer hover:text-blue-500 hover:underline">
          <a
            onClick={() => open("https://github.com/milisp/mcp-linker")}
            className="flex text-xl font-bold text-gray-800 dark:text-gray-100 mb-2"
          >
            <img src="/logo.png" alt="Logo" style={{ width: 32, height: 32 }} />
            {t("appStore")}
          </a>
        </div>

        <nav>
          <ul>
            {appCategories.map((category) => (
              <li key={category.id}>
                <button
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center w-full px-4 py-3 rounded-lg text-left ${
                    selectedCategory.id === category.id
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="mr-3">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* User section */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-medium text-lg">
                {t("username")[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {t("username")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer transition-colors">
                {t("viewProfile")}
              </p>
            </div>
          </div>
          <ModeToggle />
        </div>
      </div>
    </div>
  );
};
