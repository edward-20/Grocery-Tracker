import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

import { loadEnv } from 'vite';

const env = loadEnv('development', '../../', '');

console.log(env);

export default defineConfig({ plugins: [tailwindcss(), sveltekit()], envDir: '../../' });
