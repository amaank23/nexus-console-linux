use crate::error::{AppError, AppResult};
use std::io::Read;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

/// Fixed, unprivileged adapter commands. No shell, pager, password prompt, or
/// unbounded output. Run only inside spawn_blocking.
pub(super) fn run(program: &str, args: &[&str]) -> AppResult<String> {
    run_bounded(program, args, Duration::from_secs(10), 4 * 1024 * 1024)
}

fn run_bounded(program: &str, args: &[&str], timeout: Duration, limit: usize) -> AppResult<String> {
    let mut child = Command::new(program)
        .args(args)
        .env("LC_ALL", "C")
        .env("SYSTEMD_COLORS", "0")
        .env("SYSTEMD_PAGER", "cat")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| AppError::Shell(format!("Cannot run {program}: {e}")))?;
    let stdout = child.stdout.take().expect("piped stdout");
    let stderr = child.stderr.take().expect("piped stderr");
    let out_reader = thread::spawn(move || read_limited(stdout, limit));
    let err_reader = thread::spawn(move || read_limited(stderr, 32 * 1024));
    let start = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Ok(status),
            Ok(None) if start.elapsed() < timeout => thread::sleep(Duration::from_millis(20)),
            result => {
                let _ = child.kill();
                let _ = child.wait();
                break Err(AppError::Shell(match result {
                    Err(e) => format!("Cannot wait for {program}: {e}"),
                    _ => format!(
                        "{program} timed out after {} seconds",
                        timeout.as_secs_f32()
                    ),
                }));
            }
        }
    };
    // Both pipes are drained concurrently so a full stderr pipe cannot deadlock
    // the child. Readers stop after the limit and close their own pipe.
    let out = out_reader
        .join()
        .map_err(|_| AppError::Io("stdout reader failed".into()))??;
    let err = err_reader
        .join()
        .map_err(|_| AppError::Io("stderr reader failed".into()))??;
    let status = status?;
    if out.len() > limit || err.len() > 32 * 1024 {
        return Err(AppError::Shell(format!(
            "{program} exceeded the output limit"
        )));
    }
    if !status.success() {
        let detail = String::from_utf8_lossy(&err);
        return Err(AppError::Shell(format!(
            "{program} failed ({status}): {}",
            detail.trim()
        )));
    }
    String::from_utf8(out)
        .map_err(|e| AppError::Parse(format!("{program} returned invalid UTF-8: {e}")))
}

fn read_limited(reader: impl Read, limit: usize) -> AppResult<Vec<u8>> {
    let mut bytes = Vec::new();
    reader
        .take((limit + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|e| AppError::Io(format!("Cannot read command output: {e}")))?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_missing_and_failed_commands() {
        assert!(run("/does-not-exist/nexus-command", &[]).is_err());
        assert!(run("/usr/bin/false", &[]).is_err());
    }

    #[test]
    fn limits_output_and_times_out_owned_child() {
        let error =
            run_bounded("/usr/bin/printf", &["123456789"], Duration::from_secs(1), 4).unwrap_err();
        assert!(error.to_string().contains("output limit"));
        let start = Instant::now();
        let error =
            run_bounded("/usr/bin/sleep", &["2"], Duration::from_millis(40), 100).unwrap_err();
        assert!(error.to_string().contains("timed out"));
        assert!(start.elapsed() < Duration::from_secs(1));
    }
}
