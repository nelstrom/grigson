export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy('assets');
  eleventyConfig.addPassthroughCopy({
    'node_modules/grigson/dist/grigson.iife.js': 'js/grigson.iife.js',
  });

  return {
    dir: {
      input: 'content',
      includes: '../_includes',
      output: '_site',
    },
  };
}
