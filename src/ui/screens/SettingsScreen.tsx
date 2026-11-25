import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Calendar, Check, CheckSquare, Download, Heart, Moon, Paintbrush, Smartphone, Sparkles, Timer, Upload, Vibrate, Zap } from 'lucide-react';
import { ACCENTS, REMINDER_OPTIONS, type ThemeMode } from '../../model/types';
import { useData } from '../../store/store';
import { useUI } from '../../store/ui';
import { parseBackup } from '../../store/backup';
import { Header } from '../components/Header';
import { Row, Segmented, Toggle } from '../components/Controls';
import { Checkbox } from '../components/Checkbox';
import { inkFor } from '../theme';
import { formatTime } from '../../model/dates';
import { exportBackup, readFileText } from '../../platform/backupIO';
import { getReminderStatus, openExactAlarmSettings, requestReminderPermission, sendTestNotification, type ReminderStatus } from '../../platform/reminders';
import { haptic, isNative } from '../../platform/native';

export function SettingsScreen() {
  const settings = useData((s) => s.data.settings);
  const data = useData((s) => s.data);
  const update = useData((s) => s.updateSettings);
  const showSnack = useData((s) => s.showSnack);
  const openSheet = useUI((s) => s.openSheet);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  const [demoTick, setDemoTick] = useState(true);

  const refreshStatus = () => void getReminderStatus().then(setStatus);
  useEffect(() => {
    refreshStatus();
    const onVis = () => document.visibilityState === 'visible' && refreshStatus();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [data.tasks]);

  const custom = !ACCENTS.includes(settings.accent);
  const open = data.tasks.filter((t) => t.completedAt == null).length;

  return (
    <section className="screen">
      <Header title="Settings" search={false} />
      <div className="scroll">
        {/* -------- Appearance -------- */}
        <div className="section-title">Appearance</div>
        <div className="group">
          <div className="row row--stack">
            <span className="row__label">
              <span className="row__title">
                <Moon size={18} /> Theme
              </span>
            </span>
            <Segmented<ThemeMode>
              label="Theme"
              value={settings.theme}
              onChange={(theme) => update({ theme })}
              options={[
                { value: 'system', label: 'Auto' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>
          <div className="row row--stack">
            <span className="row__label">
              <span className="row__title">
                <Paintbrush size={18} /> Accent colour
              </span>
            </span>
            <div className="swatches swatches--accent">
              {ACCENTS.map((c) => (
                <button key={c} className={`swatch ${c === settings.accent ? 'swatch--on' : ''}`} style={{ background: c, color: inkFor(c) }} onClick={() => { update({ accent: c }); haptic('light'); }} aria-label={`Accent ${c}`}>
                  {c === settings.accent && <Check size={18} strokeWidth={3} />}
                </button>
              ))}
              <label className={`swatch swatch--custom ${custom ? 'swatch--on' : ''}`} style={custom ? { background: settings.accent, color: inkFor(settings.accent) } : undefined} aria-label="Custom accent colour">
                {custom ? <Check size={18} strokeWidth={3} /> : <span>+</span>}
                <input type="color" value={settings.accent} onChange={(e) => update({ accent: e.target.value })} />
              </label>
            </div>
            <div className="accent-preview">
              <Checkbox checked={demoTick} onToggle={() => setDemoTick((v) => !v)} label="Preview checkbox" />
              <span className="accent-preview__chip">Preview</span>
              <span className="accent-preview__btn">Add task</span>
            </div>
          </div>
          <Row icon={<Sparkles size={18} />} label="Reduce motion" sub="Calmer animations">
            <Toggle checked={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} label="Reduce motion" />
          </Row>
        </div>

        {/* -------- Tasks -------- */}
        <div className="section-title">Tasks</div>
        <div className="group">
          <div className="row">
            <span className="row__icon">
              <Calendar size={18} />
            </span>
            <span className="row__label">Week starts on</span>
            <div style={{ width: 150 }}>
              <Segmented<0 | 1>
                label="Week starts on"
                value={settings.weekStart}
                onChange={(weekStart) => update({ weekStart })}
                options={[
                  { value: 1, label: 'Mon' },
                  { value: 0, label: 'Sun' },
                ]}
              />
            </div>
          </div>
          <Row icon={<CheckSquare size={18} />} label="Show completed in lists" sub="Open lists with done tasks expanded">
            <Toggle checked={settings.showCompletedInLists} onChange={(v) => update({ showCompletedInLists: v })} label="Show completed in lists" />
          </Row>
          <Row icon={<Vibrate size={18} />} label="Haptics" sub="Little buzzes when you tick things off">
            <Toggle checked={settings.haptics} onChange={(v) => update({ haptics: v })} label="Haptics" />
          </Row>
        </div>

        {/* -------- Reminders -------- */}
        <div className="section-title">Reminders</div>
        {status?.platform === 'native' && status.permission !== 'granted' && (
          <div className="banner banner--warn">
            <BellRing size={20} />
            <div>
              <b>Notifications are off.</b> Reminders can't pop up until you allow them.
              <button
                className="banner__btn"
                onClick={async () => {
                  const ok = await requestReminderPermission();
                  refreshStatus();
                  if (!ok) showSnack('Turn them on in Android Settings → Apps → Doable → Notifications', undefined, '⚙️');
                }}
              >
                Allow notifications
              </button>
            </div>
          </div>
        )}
        {status?.platform === 'native' && status.permission === 'granted' && status.exact !== 'granted' && (
          <div className="banner banner--warn">
            <Timer size={20} />
            <div>
              <b>Reminders may be a few minutes late.</b> Allow "Alarms & reminders" so they ring on the exact minute.
              <button className="banner__btn" onClick={() => void openExactAlarmSettings().then(refreshStatus)}>
                Allow exact alarms
              </button>
            </div>
          </div>
        )}
        <div className="group">
          <div className="row">
            <span className="row__icon">
              <Bell size={18} />
            </span>
            <span className="row__label">
              Default reminder
              <span className="row__sub">For new tasks with a due date</span>
            </span>
            <label className="select-pill">
              {REMINDER_OPTIONS.find((o) => o.value === settings.defaultReminder)?.label ?? 'Custom'}
              <select
                value={settings.defaultReminder == null ? '' : String(settings.defaultReminder)}
                onChange={(e) => update({ defaultReminder: e.target.value === '' ? null : Number(e.target.value) })}
                aria-label="Default reminder"
              >
                {REMINDER_OPTIONS.map((o) => (
                  <option key={String(o.value)} value={o.value == null ? '' : String(o.value)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <span className="row__icon">
              <Timer size={18} />
            </span>
            <span className="row__label">
              All-day tasks remind at
              <span className="row__sub">When a task has a date but no time</span>
            </span>
            <label className="select-pill">
              {formatTime(settings.allDayReminderTime)}
              <input type="time" value={settings.allDayReminderTime} onChange={(e) => e.target.value && update({ allDayReminderTime: e.target.value })} aria-label="All-day reminder time" />
            </label>
          </div>
          {status?.platform === 'native' ? (
            <Row
              icon={<Zap size={18} />}
              label="Send a test reminder"
              sub={`${status.scheduled} reminder${status.scheduled === 1 ? '' : 's'} scheduled · ${status.exact === 'granted' ? 'exact timing on' : 'may be slightly late'}`}
              onClick={async () => {
                const ok = await sendTestNotification();
                showSnack(ok ? 'Test reminder coming in 5 seconds…' : 'Allow notifications first', undefined, ok ? '🔔' : '⚠️');
              }}
            />
          ) : (
            <Row icon={<Smartphone size={18} />} label="Reminders run in the Android app" sub="Real notifications at the due time, even when Doable is closed" />
          )}
        </div>

        {/* -------- Backup -------- */}
        <div className="section-title">Backup</div>
        <div className="group">
          <Row
            icon={<Upload size={18} />}
            label="Export backup"
            sub={`Save all ${data.tasks.length} tasks & ${data.lists.length} lists as a .json file`}
            onClick={async () => {
              try {
                const how = await exportBackup(data);
                if (how === 'downloaded') showSnack('Backup downloaded', undefined, '💾');
              } catch (e) {
                if (!String(e).toLowerCase().includes('cancel')) showSnack('Export failed — try again', undefined, '⚠️');
              }
            }}
          />
          <Row icon={<Download size={18} />} label="Import backup" sub="Restore from a Doable .json file" onClick={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const parsed = parseBackup(await readFileText(f));
                openSheet({ kind: 'import', backup: parsed });
              } catch (err) {
                showSnack(err instanceof Error ? err.message : 'Could not read that file', undefined, '⚠️');
              }
            }}
          />
        </div>
        <p className="hint" style={{ textAlign: 'left', margin: '10px 4px 0' }}>
          Everything is stored only on this phone — no account, no cloud. Export a backup now and then so you never lose anything.
        </p>

        {/* -------- About -------- */}
        <div className="about">
          <div className="about__logo">
            <img src="./icon.svg" alt="" width={56} height={56} />
          </div>
          <div className="about__name">Doable</div>
          <div className="about__ver">
            Version {__APP_VERSION__} · {open} open task{open === 1 ? '' : 's'}
          </div>
          <div className="about__free">
            <Heart size={14} fill="currentColor" /> 100% free · no ads · no subscriptions · works offline
          </div>
          {!isNative && <div className="about__ver">Running in a browser preview</div>}
        </div>
      </div>
    </section>
  );
}
