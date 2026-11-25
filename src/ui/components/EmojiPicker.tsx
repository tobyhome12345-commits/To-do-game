import { useState } from 'react';

const GROUPS: [string, string][] = [
  ['School', '📚 📖 📝 ✏️ 📐 🧪 🔬 💻 🖥️ 📊 📎 📌 🗂️ 🎒 🏫 🧮 🗣️ 🌍 🎓 📏'],
  ['Home', '🏠 🧹 🧺 🛏️ 🍽️ 🧽 🪴 🐶 🐱 🐟 🐹 🔧 🛒 🗑️ 💡 🧼 🚿 📦 🪥 🧸'],
  ['Health', '🏃 🏋️ ⚽ 🏀 🎾 🚴 🏊 🧘 💊 🦷 🥗 🍎 💧 😴 🧠 ❤️‍🩹 🥾 ⛹️ 🤸 🏓'],
  ['Fun', '🎮 🎸 🎨 🎬 🎧 📷 🧩 🎲 🎤 🎹 📺 🎯 🛹 🎳 🎭 🪁 🎪 🕹️ 🥁 🎻'],
  ['Life', '🎂 🎁 ✈️ 🚗 🚌 💰 💳 📅 ⏰ 📞 ✉️ 👕 👟 🧳 💇 🛍️ 🏦 🔑 🧾 📱'],
  ['Food', '🍕 🍔 🍝 🍪 🍩 🍓 🥐 ☕ 🧃 🍿 🌮 🍣 🥞 🍜 🧁 🍫 🥤 🍌 🥕 🍳'],
  ['Vibes', '⭐ ✨ 🔥 💯 🎉 👍 💪 🙌 🙏 😎 🤓 🥳 🤔 😅 😴 🚀 🌈 ☀️ 🌙 ⚡'],
];

export function EmojiPicker({ value, onPick }: { value?: string; onPick: (e: string | undefined) => void }) {
  const [group, setGroup] = useState(0);
  const [typed, setTyped] = useState('');
  return (
    <div className="emoji-picker">
      <div className="emoji-picker__tabs" role="tablist">
        {GROUPS.map(([name], i) => (
          <button key={name} type="button" role="tab" aria-selected={i === group} className={`emoji-tab ${i === group ? 'emoji-tab--on' : ''}`} onClick={() => setGroup(i)}>
            {name}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {GROUPS[group][1].split(' ').map((e) => (
          <button key={e} type="button" className={`emoji-cell ${e === value ? 'emoji-cell--on' : ''}`} onClick={() => onPick(e)} aria-label={`Emoji ${e}`}>
            {e}
          </button>
        ))}
      </div>
      <div className="emoji-picker__foot">
        <input
          className="input input--small"
          placeholder="Or type any emoji…"
          value={typed}
          onChange={(e) => {
            const v = e.target.value.trim();
            setTyped(v);
            // Grab the first grapheme so a whole emoji (with skin tones / ZWJ) is kept intact.
            const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? [...new Intl.Segmenter().segment(v)][0]?.segment : [...v][0];
            if (seg && /\p{Extended_Pictographic}/u.test(seg)) onPick(seg);
          }}
          aria-label="Type an emoji"
        />
        {value && (
          <button type="button" className="btn btn--ghost" onClick={() => onPick(undefined)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
