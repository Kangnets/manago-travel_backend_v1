-- 여행사 대표메일(agency_email) 컬럼 추가
-- 개발 환경에서는 TypeORM synchronize로 자동 반영되며, 프로덕션 등 수동 스키마 적용 시 사용

ALTER TABLE users
ADD COLUMN IF NOT EXISTS agency_email VARCHAR(100) NULL;

COMMENT ON COLUMN users.agency_email IS '여행사 대표메일 (담당자 로그인 이메일과 별도)';
