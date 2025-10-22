module.exports = {
  plugins: {
    'postcss-pxtorem': {
      // 与 html { font-size: 26.6666666667vw } 对应，使 1rem = 100px（在 375px 视口）
      rootValue: 100,
      propList: ['*'],
      replace: true,
      mediaQuery: false,
      minPixelValue: 1,
      // 如需排除某些选择器可加入 selectorBlackList: ['.ignore-rem']
    }
  }
};