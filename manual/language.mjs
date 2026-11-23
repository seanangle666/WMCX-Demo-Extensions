import fs from 'node:fs';

export const languages = {
    'zh-TW': '繁體中文', en: 'English', ja: '日本語', 'zh-CN': '简体中文', ko: '한국어'
};
export const locale = process.argv[2] || 'zh-TW';
if (!Object.hasOwn(languages, locale)) throw new Error(`Unknown locale: ${locale}`);
const dictionary = locale === 'zh-TW' ? {} : JSON.parse(
    fs.readFileSync(new URL(`./locales/${locale}.json`, import.meta.url), 'utf8')
);

// Translators may reorder code spans, but API names and literal values stay verbatim.
const codeSpans = text => JSON.stringify((text.match(/`[^`]+`/g) || []).sort());
for (const [original, translated] of Object.entries(dictionary)) {
    if (codeSpans(original) !== codeSpans(translated)) {
        throw new Error(`Changed inline code in ${locale}: ${original}`);
    }
}

export function translate(text) {
    if (locale === 'zh-TW' || !/\p{Script=Han}/u.test(text)) return text;
    const key = text.trim();
    if (!Object.hasOwn(dictionary, key) || !dictionary[key]) {
        throw new Error(`Missing ${locale} translation: ${key}`);
    }
    return text.replace(key, () => dictionary[key]);
}

export function localizeData(value, key) {
    if (['code', 'syntax', 'defaultValue'].includes(key)) return value;
    if (typeof value === 'string') return translate(value);
    if (Array.isArray(value)) return value.map(item => localizeData(item));
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, localizeData(item, name)]));
    }
    return value;
}

export function languageMenu(id) {
    const parent = locale === 'zh-TW' ? './' : '../';
    const choices = Object.entries(languages).map(([tag, name]) => ({
        tag, name, url: parent + (tag === 'zh-TW' ? '' : tag + '/') + id + '.html'
    }));
    const options = choices.map(({ tag, name, url }) =>
        `<option lang="${tag}" value="${url}"${tag === locale ? ' selected' : ''}>${name}</option>`
    ).join('');
    const links = choices.map(({ tag, name, url }) =>
        `<a href="${url}" lang="${tag}" hreflang="${tag}">${name}</a>`
    ).join(' · ');
    const labels = { 'zh-TW': '語言', en: 'Language', ja: '言語', 'zh-CN': '语言', ko: '언어' };
    return `<select class="popup-setting-dropdown" aria-label="${labels[locale]}" title="${labels[locale]}" onchange="location.assign(this.value + location.search + location.hash)">${options}</select><noscript><style>.popup-setting-dropdown{display:none}</style>${links}</noscript>`;
}

function escapeText(text) {
    return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function renderHome(template, baseUrl) {
    return template
        .replace(/>([^<>]+)</g, (whole, text) => /\p{Script=Han}/u.test(text) ? '>' + escapeText(translate(text)) + '<' : whole)
        .replace(/(content|aria-label|placeholder|title)="([^"]+)"/g, (whole, attr, text) =>
            /\p{Script=Han}/u.test(text) ? `${attr}="${escapeText(translate(text))}"` : whole)
        .replace(/<(li|p) data-inline-code>([^<]*)<\/\1>/g, (_, tag, text) =>
            `<${tag}>${text.replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')}</${tag}>`)
        .replace('lang="zh-TW"', `lang="${locale}"`)
        .replace('<!-- canonical -->', `<link rel="canonical" href="${baseUrl}/">`)
        .replace('<!-- languages -->', languageMenu('index'));
}

export function localizeClient(script) {
    return script.replace(/'([^'\n]*\p{Script=Han}[^'\n]*)'/gu, (_, text) => JSON.stringify(translate(text)));
}
