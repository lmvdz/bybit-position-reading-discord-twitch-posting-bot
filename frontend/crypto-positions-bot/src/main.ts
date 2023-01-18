/*
 Copyright (c) 2022 lmvdz

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'
import Vue3Lottie from 'vue3-lottie'
import 'vue3-lottie/dist/style.css'
// Plugins
import { registerPlugins } from '@/plugins'

const app = createApp(App)

registerPlugins(app)

app.use(Vue3Lottie, { name: 'LottieAnimation' }).mount('#app')
