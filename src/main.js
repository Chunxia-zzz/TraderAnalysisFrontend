import '@fontsource/dm-sans'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/dm-mono'
import '@fontsource/dm-mono/500.css'

import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './styles/tokens.css'
import router from './router'
import App from './App.vue'

createApp(App).use(Antd).use(router).mount('#app')
