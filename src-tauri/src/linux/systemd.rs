use super::command;
use crate::error::{AppError, AppResult};
use std::collections::{BTreeMap, HashMap};

const PROPERTIES: &str = "--property=Id,Names,Description,LoadState,ActiveState,SubState,UnitFileState,MainPID,MemoryCurrent,CPUUsageNSec";

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ServiceScope {
    System,
    User,
}

impl ServiceScope {
    fn flag(self) -> &'static str {
        match self {
            Self::System => "--system",
            Self::User => "--user",
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Service {
    pub scope: ServiceScope,
    pub unit: String,
    pub description: Option<String>,
    pub load_state: Option<String>,
    pub active_state: Option<String>,
    pub sub_state: Option<String>,
    pub unit_file_state: Option<String>,
    pub main_pid: Option<u32>,
    pub memory_bytes: Option<u64>,
    /// Cumulative CPU time, not a sampled utilization percentage.
    pub cpu_time_seconds: Option<f64>,
    pub health: Health,
    pub template: bool,
    pub alias_of: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Health {
    Unknown,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScopeSnapshot {
    pub scope: ServiceScope,
    pub runtime_available: bool,
    pub unit_files_available: bool,
    pub services: Vec<Service>,
    pub warnings: Vec<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct Snapshot {
    pub scopes: Vec<ScopeSnapshot>,
}

/// Two read-only queries per scope, including installed/unloaded units and
/// transient runtime services. A failed user bus cannot hide system services.
pub fn discover() -> Snapshot {
    Snapshot {
        scopes: [ServiceScope::System, ServiceScope::User]
            .into_iter()
            .map(|scope| {
                let files = command::run(
                    "/usr/bin/systemctl",
                    &[
                        scope.flag(),
                        "--no-pager",
                        "--no-legend",
                        "--no-ask-password",
                        "--full",
                        "list-unit-files",
                        "--type=service",
                    ],
                )
                .and_then(|text| parse_unit_files(&text));
                let runtime = command::run(
                    "/usr/bin/systemctl",
                    &[
                        scope.flag(),
                        "--no-pager",
                        "--no-ask-password",
                        "--all",
                        PROPERTIES,
                        "show",
                        "--",
                        "*.service",
                    ],
                )
                .and_then(|text| parse_runtime(&text, scope));
                combine_scope(scope, files, runtime)
            })
            .collect(),
    }
}

fn combine_scope(
    scope: ServiceScope,
    files: AppResult<BTreeMap<String, String>>,
    runtime: AppResult<Vec<RuntimeService>>,
) -> ScopeSnapshot {
    let mut warnings = Vec::new();
    let runtime_available = runtime.is_ok();
    let unit_files_available = files.is_ok();
    let files = files.unwrap_or_else(|e| {
        warnings.push(format!("Installed unit files: {e}"));
        BTreeMap::new()
    });
    let runtime = runtime.unwrap_or_else(|e| {
        warnings.push(format!("Runtime state: {e}"));
        Vec::new()
    });
    let mut rows = BTreeMap::new();
    let mut names = HashMap::new();
    for entry in runtime {
        for name in &entry.names {
            names.insert(name.clone(), entry.service.unit.clone());
        }
        rows.insert(entry.service.unit.clone(), entry.service);
    }
    for (unit, file_state) in files {
        if let Some(row) = rows.get_mut(&unit) {
            row.unit_file_state = Some(file_state);
            continue;
        }
        let mut row = names
            .get(&unit)
            .and_then(|id| rows.get(id))
            .cloned()
            .unwrap_or_else(|| Service {
                scope,
                unit: unit.clone(),
                description: None,
                load_state: None,
                active_state: None,
                sub_state: None,
                unit_file_state: None,
                main_pid: None,
                memory_bytes: None,
                cpu_time_seconds: None,
                health: Health::Unknown,
                template: unit.ends_with("@.service"),
                alias_of: None,
            });
        if row.unit != unit {
            row.alias_of = Some(row.unit.clone());
            row.unit = unit.clone();
        }
        row.unit_file_state = Some(file_state);
        rows.insert(unit, row);
    }
    ScopeSnapshot {
        scope,
        runtime_available,
        unit_files_available,
        services: rows.into_values().collect(),
        warnings,
    }
}

fn valid_unit(unit: &str) -> bool {
    !unit.starts_with('-')
        && unit.len() <= 255
        && unit.len() > ".service".len()
        && unit.ends_with(".service")
        && unit
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"-_:.@\\".contains(&b))
}

fn parse_unit_files(text: &str) -> AppResult<BTreeMap<String, String>> {
    let mut files = BTreeMap::new();
    for line in text.lines().filter(|line| !line.trim().is_empty()) {
        let fields: Vec<_> = line.split_whitespace().collect();
        if !(2..=3).contains(&fields.len()) || !valid_unit(fields[0]) {
            return Err(AppError::Parse(format!(
                "Invalid systemd unit-file row: {line}"
            )));
        }
        files.insert(fields[0].into(), fields[1].into());
    }
    Ok(files)
}

#[derive(Debug)]
struct RuntimeService {
    service: Service,
    names: Vec<String>,
}

fn parse_runtime(text: &str, scope: ServiceScope) -> AppResult<Vec<RuntimeService>> {
    let mut rows = Vec::new();
    let mut fields: HashMap<&str, &str> = HashMap::new();
    // Handle an absent trailing newline and property order differences.
    for line in text.lines().chain(std::iter::once("")) {
        if line.trim().is_empty() {
            if fields.is_empty() {
                continue;
            }
            let required = |key: &str| -> AppResult<String> {
                fields
                    .get(key)
                    .copied()
                    .filter(|value: &&str| !value.is_empty())
                    .map(|v| (*v).to_string())
                    .ok_or_else(|| AppError::Parse(format!("Missing systemd property: {key}")))
            };
            let unit = required("Id")?;
            if !valid_unit(&unit) {
                return Err(AppError::Parse(format!(
                    "Invalid systemd service ID: {unit}"
                )));
            }
            let value = |key: &str| {
                fields
                    .get(key)
                    .copied()
                    .filter(|v: &&str| !v.is_empty())
                    .map(|v| (*v).to_string())
            };
            let number = |key: &str| {
                fields
                    .get(key)
                    .and_then(|v| v.parse::<u64>().ok())
                    .filter(|v| *v != u64::MAX)
            };
            let names = fields
                .get("Names")
                .map(|v| {
                    v.split_whitespace()
                        .filter(|v| valid_unit(v))
                        .map(str::to_string)
                        .collect()
                })
                .unwrap_or_default();
            rows.push(RuntimeService {
                service: Service {
                    scope,
                    template: unit.ends_with("@.service"),
                    unit,
                    description: value("Description"),
                    load_state: Some(required("LoadState")?),
                    active_state: Some(required("ActiveState")?),
                    sub_state: Some(required("SubState")?),
                    unit_file_state: value("UnitFileState"),
                    main_pid: number("MainPID")
                        .and_then(|v| u32::try_from(v).ok())
                        .filter(|v| *v > 0),
                    memory_bytes: number("MemoryCurrent"),
                    cpu_time_seconds: number("CPUUsageNSec").map(|v| v as f64 / 1_000_000_000.0),
                    health: Health::Unknown,
                    alias_of: None,
                },
                names,
            });
            fields.clear();
        } else {
            let (key, value) = line
                .split_once('=')
                .ok_or_else(|| AppError::Parse("Invalid systemd property row".into()))?;
            if fields.insert(key, value).is_some() {
                return Err(AppError::Parse(format!(
                    "Duplicate systemd property: {key}"
                )));
            }
        }
    }
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    const RUNTIME: &str = "MainPID=42\nMemoryCurrent=4096\nCPUUsageNSec=1500000000\nId=dbus-broker.service\nNames=dbus-broker.service dbus.service\nDescription=Message Bus = session\nLoadState=loaded\nActiveState=active\nSubState=running\nUnitFileState=enabled";

    #[test]
    fn parses_properties_without_order_or_trailing_newline_assumptions() {
        let rows = parse_runtime(RUNTIME, ServiceScope::User).unwrap();
        let row = &rows[0].service;
        assert_eq!(row.scope, ServiceScope::User);
        assert_eq!(row.description.as_deref(), Some("Message Bus = session"));
        assert_eq!(row.main_pid, Some(42));
        assert_eq!(row.memory_bytes, Some(4096));
        assert_eq!(row.cpu_time_seconds, Some(1.5));
        let json = serde_json::to_value(row).unwrap();
        assert_eq!(json["health"], "unknown");
        assert_eq!(json["activeState"], "active");
    }

    #[test]
    fn joins_aliases_unloaded_templates_and_transient_units() {
        let files = parse_unit_files("dbus.service alias -\ndbus-broker.service enabled enabled\nworker@.service disabled enabled\ninstalled.service static -").unwrap();
        let scope = combine_scope(
            ServiceScope::System,
            Ok(files),
            parse_runtime(RUNTIME, ServiceScope::System),
        );
        assert_eq!(scope.services.len(), 4);
        let alias = scope
            .services
            .iter()
            .find(|s| s.unit == "dbus.service")
            .unwrap();
        assert_eq!(alias.alias_of.as_deref(), Some("dbus-broker.service"));
        assert_eq!(alias.active_state.as_deref(), Some("active"));
        assert_eq!(alias.unit_file_state.as_deref(), Some("alias"));
        let template = scope.services.iter().find(|s| s.template).unwrap();
        assert!(template.active_state.is_none());
        let transient = combine_scope(
            ServiceScope::User,
            Ok(BTreeMap::new()),
            parse_runtime(RUNTIME, ServiceScope::User),
        );
        assert_eq!(transient.services.len(), 1);
    }

    #[test]
    fn unavailable_scope_reports_diagnostics_without_faking_states() {
        let scope = combine_scope(
            ServiceScope::User,
            parse_unit_files("foo.service enabled"),
            Err(AppError::Shell("no user bus".into())),
        );
        assert!(!scope.runtime_available);
        assert!(scope.unit_files_available);
        assert!(scope.services[0].active_state.is_none());
        assert!(scope.warnings[0].contains("no user bus"));
        let empty = combine_scope(
            ServiceScope::User,
            Err(AppError::Shell("no files".into())),
            Err(AppError::Shell("no bus".into())),
        );
        assert_eq!(empty.warnings.len(), 2);
        assert!(empty.services.is_empty());
    }

    #[test]
    fn unset_and_sentinel_counters_are_unknown_zero_pid_is_absent() {
        let text = RUNTIME
            .replace("MainPID=42", "MainPID=0")
            .replace("MemoryCurrent=4096", "MemoryCurrent=18446744073709551615")
            .replace("CPUUsageNSec=1500000000", "CPUUsageNSec=[not set]");
        let row = &parse_runtime(&text, ServiceScope::User).unwrap()[0].service;
        assert!(row.main_pid.is_none());
        assert!(row.memory_bytes.is_none());
        assert!(row.cpu_time_seconds.is_none());
    }

    #[test]
    fn rejects_malformed_rows_and_unsafe_identifiers() {
        for unit in [
            "--bad.service",
            "../bad.service",
            "bad\n.service",
            ".service",
            "other.socket",
        ] {
            assert!(!valid_unit(unit));
        }
        assert!(valid_unit("dbus-:1.2-app@0.service"));
        assert!(valid_unit(r"escaped\x20unit.service"));
        assert!(parse_unit_files("UNIT FILE STATE").is_err());
        assert!(parse_runtime("Id=test.service", ServiceScope::System).is_err());
        assert!(parse_runtime(
            &format!("{RUNTIME}\nId=duplicate.service"),
            ServiceScope::System
        )
        .is_err());
        assert!(parse_runtime("", ServiceScope::System).unwrap().is_empty());
    }

    #[test]
    fn distinguishes_active_exited_failed_and_inactive_units() {
        let text = format!(
            "{RUNTIME}\n\n{}\n\n{}",
            RUNTIME
                .replace("dbus-broker", "oneshot")
                .replace("SubState=running", "SubState=exited"),
            RUNTIME
                .replace("dbus-broker", "broken")
                .replace("ActiveState=active", "ActiveState=failed")
                .replace("SubState=running", "SubState=failed")
        );
        let rows = parse_runtime(&text, ServiceScope::System).unwrap();
        assert_eq!(rows[1].service.active_state.as_deref(), Some("active"));
        assert_eq!(rows[1].service.sub_state.as_deref(), Some("exited"));
        assert_eq!(rows[2].service.active_state.as_deref(), Some("failed"));
        let inactive = RUNTIME
            .replace("ActiveState=active", "ActiveState=inactive")
            .replace("SubState=running", "SubState=dead");
        assert_eq!(
            parse_runtime(&inactive, ServiceScope::User).unwrap()[0]
                .service
                .active_state
                .as_deref(),
            Some("inactive")
        );
    }

    #[test]
    #[ignore = "read-only discovery requires the host system and user buses"]
    fn discovers_local_system_and_user_services() {
        let snapshot = discover();
        for scope in &snapshot.scopes {
            assert!(
                scope.runtime_available,
                "{:?}: {:?}",
                scope.scope, scope.warnings
            );
            assert!(
                scope.unit_files_available,
                "{:?}: {:?}",
                scope.scope, scope.warnings
            );
            assert!(!scope.services.is_empty());
            assert!(scope.services.iter().all(|s| s.scope == scope.scope));
        }
        eprintln!(
            "Read-only service inventory: system={}, user={}",
            snapshot.scopes[0].services.len(),
            snapshot.scopes[1].services.len()
        );
    }
}
