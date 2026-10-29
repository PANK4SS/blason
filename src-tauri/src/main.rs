// La fenêtre console de Windows n'a pas lieu d'apparaître en production.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// L'application de bureau n'est qu'une coque : la vectorisation tourne dans
/// la webview, avec le même code TypeScript que la version web. Seuls la boîte
/// de dialogue d'enregistrement et l'écriture du fichier sont natives.
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("échec du démarrage de l'application");
}
