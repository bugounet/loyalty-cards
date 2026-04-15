export default {
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
    setupFiles: ['./src/test/setup.ts'],
    globals: true
  }
};
