import { defineConfig } from 'astro/config';
import { visit } from 'unist-util-visit';

// 源導讀檔名 → 站內路由。新導讀加進 sync-notes.sh 時，這裡也要加一行。
const NOTE_ROUTES = {
  '2008_Crossley_Pretty-Connected_導讀.md': '/crossley/notes/2008-pretty-connected/',
  '2015_SNMW-Ch1_Introduction_導讀.md': '/crossley/notes/2015-snmw-ch1/',
  '2015_SNMW-Ch2_What-is-SNA_導讀.md': '/crossley/notes/2015-snmw-ch2/',
};

function rewriteNoteLinks() {
  return (tree) => {
    visit(tree, 'link', (node) => {
      const [file, hash] = node.url.split('#');
      const route = NOTE_ROUTES[decodeURIComponent(file)];
      if (route) node.url = hash ? `${route}#${hash}` : route;
    });
  };
}

export default defineConfig({
  site: 'https://bkwmt.github.io',
  markdown: { remarkPlugins: [rewriteNoteLinks] },
});
