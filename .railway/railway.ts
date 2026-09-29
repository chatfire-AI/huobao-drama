import { defineRailway, github, preserve, project, service, volume } from "railway/iac";

/**
 * Huobao Drama full-stack deployment (Railway).
 *
 * One service carries everything: the Dockerfile builds the Nuxt static frontend
 * into the image, and the backend tsx process serves /api/v1 and /static on the
 * same port. Data (SQLite, generated media, editable workspace) lives on the
 * mounted volume app-volume:/app/data.
 *
 * The resource names app / app-volume match the live resources: a whole-project
 * apply deletes undeclared resources, so renaming one deletes the running
 * service and its data volume.
 */
export default defineRailway(() => {
  const data = volume("app-volume", {
    region: "asia-southeast1-eqsg3a",
    sizeMB: 50000,
    allowOnlineResize: true,
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
  });

  const app = service("app", {
    source: github("infra-soulmate/hidrama", { branch: "main" }),
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
      // Public URL prefix for reference images (upstreams such as Seedance must reach it).
      // The live value is already set, so preserve it.
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
