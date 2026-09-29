import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

/**
 * Huobao Drama 全栈部署（Railway）
 *
 * 一个服务承载全部功能：Nuxt 静态前端由 Dockerfile 构建后内联进镜像，
 * 后端 tsx 进程同时提供 /api/v1 与 /static。数据（SQLite + 生成的媒体 +
 * 可编辑 workspace）落在挂载卷 app-volume:/app/data。
 *
 * 资源名 app / app-volume 与线上既有资源一致：整项目 apply 会删除未声明的
 * 资源，改名等于删掉运行中的服务与数据卷。
 */
export default defineRailway(() => {
  const data = volume("app-volume", {
    region: "asia-southeast1-eqsg3a",
    sizeMB: 50000,
    allowOnlineResize: true,
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  });

  const app = service("app", {
    source: github("infra-soulmate/hidrama", { branch: "master" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
    },
    deploy: {
      healthcheckPath: "/api/v1/health",
      healthcheckTimeout: 300,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
      region: "asia-southeast1-eqsg3a",
    },
    env: {
      // 参考图公网地址前缀（Seedance 等上游需可访问），线上已配置故保留原值
      PUBLIC_BASE_URL: preserve(),
    },
    volumeMounts: {
      "/app/data": data,
    },
  });

  return project("hidrama", {
    resources: [app, data],
  });
});
