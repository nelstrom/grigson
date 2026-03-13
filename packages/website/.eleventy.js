export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy({
    'node_modules/grigson/dist/grigson.iife.js': 'js/grigson.iife.js',
    '../textmate-grammar/grigson.tmLanguage.json': 'js/grigson.tmLanguage.json',
    'node_modules/monaco-editor/min/vs': 'js/monaco/vs',
  });

  return {
    dir: {
      input: 'content',
      includes: '../_includes',
      output: '_site',
    },
  };
}
