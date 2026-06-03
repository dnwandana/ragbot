import pluginVue from "eslint-plugin-vue"

export default [
  ...pluginVue.configs["flat/recommended"],
  {
    rules: {
      "vue/no-v-html": "off",
      "vue/multi-word-component-names": "off",
    },
  },
  { ignores: [".vitepress/cache/**", ".vitepress/dist/**"] },
]
