import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/db.ts 가 process.cwd()/data/*.json 을 런타임에 읽는다 (학교·보호구역·기관·사고다발).
  // 동적 경로라 파일 추적에 안 잡히므로 서버리스(Vercel) 번들에 명시적으로 포함한다.
  outputFileTracingIncludes: {
    "/*": ["data/*.json"],
  },
  // 로컬 전용 파일은 번들에서 뺀다 (원본 CSV 6MB, 파일 저장소, 시드 결과, 리포트 파일)
  outputFileTracingExcludes: {
    "/*": ["data/raw/**", "data/db.json", "data/seed-result.json", "data/reports/**", "data/mock-reports.json"],
  },
};

export default nextConfig;
