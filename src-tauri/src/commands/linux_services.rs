use crate::error::AppResult;
use crate::linux::systemd::{self, Snapshot};

#[tauri::command]
pub async fn list_systemd_services() -> AppResult<Snapshot> {
    super::blocking(|| Ok(systemd::discover())).await
}
