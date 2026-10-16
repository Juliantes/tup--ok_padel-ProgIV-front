#[tauri::command]
fn open_oauth_url(url: String) -> Result<(), String> {
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .args(["-na", "Google Chrome", "--args", &format!("--app={url}")])
      .spawn()
      .map_err(|err| err.to_string())?;
    Ok(())
  }

  #[cfg(not(target_os = "macos"))]
  {
    open::that(&url).map_err(|err| err.to_string())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_oauth::init())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![open_oauth_url])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
