export default function (eleventyConfig) {
  return {
    dir: {
      input: 'content',
      includes: '../_includes',
      data: '../_data',
      output: '_site',
    },
  };
}
