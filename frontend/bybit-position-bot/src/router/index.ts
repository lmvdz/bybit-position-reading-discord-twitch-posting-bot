import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes = [{ path: '/', name: 'Home', component: () => import('../components/Home.vue')}] as Array<RouteRecordRaw>
const router = createRouter({ history: createWebHistory(), routes: routes })
export default router;