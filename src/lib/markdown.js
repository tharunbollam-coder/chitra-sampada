import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { canonicalizeAnimeTabHref } from './anime-links.ts';

const tags = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'dd', 'del',
  'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'hr', 'i', 'img', 'input', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 's', 'section',
  'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
  'thead', 'tr', 'u', 'ul'
];

const color = /^(?:#[0-9a-f]{3,8}|[a-z]+|(?:rgba?|hsla?|oklch)\([0-9.,% +/\-]+\))$/i;
const spacing = /^(?:(?:-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|ch|vw|vh|%)?|auto)(?:\s+|$)){1,4}$/i;
const border = /^(?:[\w. #%+-]+|[\w. #%+-]+(?:rgba?|hsla?|oklch)\([0-9.,% +/\-]+\))$/i;

const editorialOptions = {
  allowedTags: tags,
  allowedAttributes: {
    '*': ['class', 'id', 'title', 'lang', 'dir', 'role', 'aria-label', 'aria-hidden', 'style'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
    input: ['type', 'disabled', 'checked'],
    ol: ['start', 'reversed', 'type'],
    li: ['value'],
    th: ['align', 'scope', 'colspan', 'rowspan'],
    td: ['align', 'colspan', 'rowspan'],
    col: ['span'],
    colgroup: ['span'],
    details: ['open']
  },
  allowedSchemes: ['http', 'https'],
  allowedSchemesByTag: { a: ['http', 'https', 'mailto', 'tel'] },
  nonTextTags: ['script', 'style', 'textarea', 'option', 'xmp', 'noscript', 'template', 'iframe', 'object', 'svg', 'math'],
  allowedStyles: {
    '*': {
      color: [color],
      background: [color],
      'background-color': [color],
      'border-color': [color],
      border: [border],
      'border-top': [border],
      'border-right': [border],
      'border-bottom': [border],
      'border-left': [border],
      'border-radius': [spacing],
      padding: [spacing],
      'padding-top': [spacing],
      'padding-right': [spacing],
      'padding-bottom': [spacing],
      'padding-left': [spacing],
      margin: [spacing],
      'margin-top': [spacing],
      'margin-right': [spacing],
      'margin-bottom': [spacing],
      'margin-left': [spacing],
      'max-width': [spacing],
      width: [spacing],
      height: [spacing],
      'font-size': [spacing],
      'line-height': [spacing, /^normal$/i],
      'font-style': [/^(?:normal|italic|oblique)$/i],
      'font-weight': [/^(?:[1-9]00|normal|bold|lighter|bolder)$/i],
      'text-align': [/^(?:left|right|center|justify|start|end)$/i],
      'text-decoration': [/^(?:none|underline|line-through|overline)$/i],
      'white-space': [/^(?:normal|nowrap|pre|pre-wrap|pre-line|break-spaces)$/i]
    }
  }
};

const watchOrderOptions = {
  ...editorialOptions,
  // Watch-order steps already have dedicated links. Keep any inline link text.
  allowedTags: tags.filter((tag) => tag !== 'a'),
  exclusiveFilter: excludeInteractiveInput
};

/** @param {string} markdown @param {string} canonicalUrl */
export function renderArticleMarkdown(markdown, canonicalUrl) {
  return sanitizeHtml(marked.parse(markdown, { async: false }), {
    ...editorialOptions,
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.href) attribs.href = canonicalizeAnimeTabHref(attribs.href, canonicalUrl);
        if (attribs.target?.toLowerCase() === '_blank') {
          const rel = (attribs.rel || '').split(/\s+/).filter((value) => value && value.toLowerCase() !== 'opener');
          attribs.rel = [...new Set([...rel, 'noopener'])].join(' ');
        }
        return { tagName, attribs };
      }
    },
    exclusiveFilter: excludeInteractiveInput
  });
}

/** @param {{tag: string, attribs: Record<string, string>}} frame */
function excludeInteractiveInput(frame) {
  return frame.tag === 'input' && (frame.attribs.type !== 'checkbox' || !Object.hasOwn(frame.attribs, 'disabled'));
}

/** @param {string} markdown */
export function renderWatchOrderMarkdown(markdown) {
  const html = marked.parse(markdown, { async: false, breaks: true, gfm: true });
  const formatted = html.replace(/<li>([\s\S]*?)<\/li>/gi, (item, content) => {
    const [title, ...description] = content.split(/<br\s*\/?>/i);
    if (!description.length) return item;
    const titleText = title.replace(/<\/?p>/gi, '').trim();
    const descriptionText = description.join('<br />').replace(/<\/?p>/gi, '').trim();
    return '<li><div class="font-bold text-slate-950">' + titleText
      + '</div><div class="mt-1 text-slate-600 text-xs sm:text-sm font-normal leading-relaxed">'
      + descriptionText + '</div></li>';
  });
  return sanitizeHtml(formatted, watchOrderOptions);
}
