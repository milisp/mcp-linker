use tauri::menu::{Menu, MenuItem, MenuItemKind};
use tauri::{App, Emitter, Manager, Runtime};

const CHECK_FOR_UPDATES_ID: &str = "check-for-updates";
// Listened to by src/components/UpdateChecker.tsx
const CHECK_FOR_UPDATES_EVENT: &str = "menu://check-for-updates";

/// Install the default macOS menu with "Check for Updates…" inserted right
/// below "About <App>" in the application submenu.
pub fn setup<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let handle = app.handle();
    let menu = Menu::default(handle)?;

    if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.into_iter().next() {
        let check_item = MenuItem::with_id(
            handle,
            CHECK_FOR_UPDATES_ID,
            "Check for Updates…",
            true,
            None::<&str>,
        )?;
        // Index 0 is "About <App>"
        app_menu.insert(&check_item, 1)?;
    }

    app.set_menu(menu)?;

    app.on_menu_event(|app, event| {
        if event.id() == CHECK_FOR_UPDATES_ID {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            let _ = app.emit(CHECK_FOR_UPDATES_EVENT, ());
        }
    });

    Ok(())
}
