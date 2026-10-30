// There is no reason for the Windows console window to show up in production.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// The desktop application is only a shell: vectorization runs in the webview,
/// with the same TypeScript code as the web version. Only the save dialog and
/// writing the file are native.
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("failed to start the application");
}
