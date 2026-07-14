
export const Config = {
  ports: {
    server: Number(process.env.PORT_SERVER) || 3000, // 服务端端口
    ai: Number(process.env.PORT_AI) || 3001, // AI端口
    web: Number(process.env.PORT_WEB) || 8080, // 前端端口
  },
};