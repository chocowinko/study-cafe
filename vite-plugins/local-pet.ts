/**
 * 本地 Pet 控制插件
 *
 * 拦截 /api/pet/summon 和 /api/pet/dismiss，在本机 spawn/kill Electron 桌宠进程，
 * 而不是把请求代理到云后端（云服务器没桌面，spawn Electron 没意义）。
 *
 * 仅在 vite dev 模式下生效，生产打包时如何处理交给后续部署考虑。
 */
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import type { Plugin } from 'vite';

export function localPetPlugin(): Plugin {
  let petProcess: ChildProcess | null = null;

  const electronPath = process.platform === 'win32'
    ? path.resolve(process.cwd(), 'node_modules/electron/dist/electron.exe')
    : path.resolve(process.cwd(), 'node_modules/.bin/electron');

  const petScript = path.resolve(process.cwd(), 'pet/electron-main.cjs');

  return {
    name: 'local-pet-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();

        // 只拦截 pet 相关接口
        if (req.url === '/api/pet/summon' && req.method === 'POST') {
          if (!petProcess || petProcess.killed) {
            try {
              petProcess = spawn(electronPath, [petScript], {
                detached: false,
                stdio: 'ignore',
              });
              petProcess.on('exit', () => { petProcess = null; });
              petProcess.on('error', (err) => {
                console.error('[pet] spawn error:', err);
                petProcess = null;
              });
            } catch (err) {
              console.error('[pet] failed to spawn:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: false, message: String(err) }));
              return;
            }
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, source: 'local' }));
          return;
        }

        if (req.url === '/api/pet/dismiss' && req.method === 'POST') {
          if (petProcess && !petProcess.killed) {
            petProcess.kill();
            petProcess = null;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, source: 'local' }));
          return;
        }

        next();
      });
    },
  };
}
